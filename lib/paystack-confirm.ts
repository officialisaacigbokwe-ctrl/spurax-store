import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOrderPaid } from "@/lib/order-emails";

export type ConfirmResult = {
  orderId: string | null;
  state: "paid" | "failed" | "pending" | "not_found";
};

// Asks Paystack whether a payment really succeeded, checks the amounts,
// then finishes the order in one safe database step.
export async function confirmPaystackPayment(
  reference: string
): Promise<ConfirmResult> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey || !secretKey.startsWith("sk_test_")) {
    console.error("Paystack test secret key is missing or invalid.");
    return { orderId: null, state: "failed" };
  }

  const admin = createAdminClient();

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, order_id, provider_reference, amount, currency, status")
    .eq("provider_reference", reference)
    .eq("provider", "paystack")
    .maybeSingle();

  if (paymentError || !payment) {
    return { orderId: null, state: "not_found" };
  }

  // Never downgrade or repeat a payment that is already confirmed.
  if (payment.status === "paid") {
    return { orderId: payment.order_id, state: "paid" };
  }

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    }
  );

  const verification = await verifyResponse.json().catch(() => null);

  if (!verifyResponse.ok || !verification?.status || !verification.data) {
    return { orderId: payment.order_id, state: "pending" };
  }

  const transaction = verification.data;
  const expectedAmount = Math.round(Number(payment.amount) * 100);

  const verified =
    transaction.status === "success" &&
    transaction.reference === payment.provider_reference &&
    transaction.currency === payment.currency &&
    Number(transaction.amount) === expectedAmount;

  if (!verified) {
    if (transaction.status === "success") {
      // Money moved but the details do not match. Never mark this as paid.
      console.error("Paystack payment did not match our records:", reference);
      return { orderId: payment.order_id, state: "failed" };
    }

    const failureStatus =
      transaction.status === "abandoned"
        ? "abandoned"
        : transaction.status === "reversed"
          ? "reversed"
          : transaction.status === "failed"
            ? "failed"
            : "processing";

    await admin
      .from("payments")
      .update({
        status: failureStatus,
        gateway_response: String(
          transaction.gateway_response ||
            transaction.status ||
            "Payment not successful"
        ),
      })
      .eq("id", payment.id)
      .neq("status", "paid");

    return {
      orderId: payment.order_id,
      state: failureStatus === "processing" ? "pending" : "failed",
    };
  }

  // The verified payment must also match the order itself.
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, total, currency")
    .eq("id", payment.order_id)
    .maybeSingle();

  if (
    orderError ||
    !order ||
    order.currency !== transaction.currency ||
    Math.round(Number(order.total) * 100) !== Number(transaction.amount)
  ) {
    console.error("Verified transaction did not match its order.");
    return { orderId: payment.order_id, state: "failed" };
  }

  // Finish everything in one safe step (payment, order and stock).
  const { data: finalized, error: finalizeError } = await admin.rpc(
    "finalize_paid_order",
    {
      p_payment_id: payment.id,
      p_transaction_id: String(transaction.id),
      p_channel: transaction.channel || null,
      p_gateway_response: String(transaction.gateway_response || "Successful"),
      p_paid_at: transaction.paid_at || new Date().toISOString(),
    }
  );

  if (finalizeError) {
    console.error("Could not finalize paid order:", finalizeError.message);
    return { orderId: payment.order_id, state: "pending" };
  }

  // The database says "true" only for the one call that actually finished
  // the order, so the emails are sent once even if the callback and the
  // webhook both arrive.
  if (finalized === true) {
    await notifyOrderPaid(payment.order_id);
  }

  return { orderId: payment.order_id, state: "paid" };
}