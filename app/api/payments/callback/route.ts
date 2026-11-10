import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    return NextResponse.json(
      { error: "Site URL is not configured." },
      { status: 500 }
    );
  }

  const baseUrl = siteUrl.replace(/\/$/, "");

  function redirectToCheckout() {
    return NextResponse.redirect(`${baseUrl}/checkout?payment=failed`);
  }

  if (!reference) {
    return redirectToCheckout();
  }

  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey || !secretKey.startsWith("sk_test_")) {
      console.error("Paystack test secret key is missing or invalid.");
      return redirectToCheckout();
    }

    const admin = createAdminClient();

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select(
        "id, order_id, provider_reference, amount, currency, status"
      )
      .eq("provider_reference", reference)
      .eq("provider", "paystack")
      .single();

    if (paymentError || !payment) {
      return redirectToCheckout();
    }

    // Never downgrade a payment that has already been confirmed.
    if (payment.status === "paid") {
      return NextResponse.redirect(
        `${baseUrl}/orders/${payment.order_id}?payment=success`
      );
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
        cache: "no-store",
      }
    );

    const verification = await verifyResponse.json();

    if (!verifyResponse.ok || !verification.status) {
      return redirectToCheckout();
    }

    const transaction = verification.data;
    const expectedAmount = Math.round(Number(payment.amount) * 100);

    const verified =
      transaction.status === "success" &&
      transaction.reference === payment.provider_reference &&
      transaction.currency === payment.currency &&
      Number(transaction.amount) === expectedAmount;

    if (!verified) {
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

      return NextResponse.redirect(
        `${baseUrl}/orders/${payment.order_id}?payment=failed`
      );
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, total, currency, payment_status")
      .eq("id", payment.order_id)
      .single();

    if (
      orderError ||
      !order ||
      order.currency !== transaction.currency ||
      Math.round(Number(order.total) * 100) !==
        Number(transaction.amount)
    ) {
      console.error("Verified transaction did not match its order.");

      return NextResponse.redirect(
        `${baseUrl}/orders/${payment.order_id}?payment=failed`
      );
    }

    const { error: updatePaymentError } = await admin
      .from("payments")
      .update({
        status: "paid",
        provider_transaction_id: String(transaction.id),
        channel: transaction.channel || null,
        gateway_response: String(
          transaction.gateway_response || "Successful"
        ),
        paid_at: transaction.paid_at || new Date().toISOString(),
      })
      .eq("id", payment.id)
      .neq("status", "paid");

    if (updatePaymentError) {
      console.error(
        "Could not mark payment as paid:",
        updatePaymentError.message
      );

      return NextResponse.redirect(
        `${baseUrl}/orders/${payment.order_id}?payment=pending`
      );
    }

    const { error: updateOrderError } = await admin
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", order.id);

    if (updateOrderError) {
      console.error(
        "Payment verified but order update failed:",
        updateOrderError.message
      );

      return NextResponse.redirect(
        `${baseUrl}/orders/${payment.order_id}?payment=pending`
      );
    }

    return NextResponse.redirect(
      `${baseUrl}/orders/${payment.order_id}?payment=success`
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return redirectToCheckout();
  }
}