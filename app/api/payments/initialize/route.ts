import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculatePlatformFeeKobo } from "@/lib/platform-fee";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in before paying." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const orderId = typeof body?.orderId === "string" ? body.orderId : "";

    if (!orderId) {
      return NextResponse.json(
        { error: "A valid order ID is required." },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select(
        "id, user_id, store_id, total, currency, customer_email, payment_status"
      )
      .eq("id", orderId)
      .maybeSingle();

    // The order must exist and belong to the person who is paying.
    if (orderError || !order || order.user_id !== user.id) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (order.payment_status === "paid") {
      return NextResponse.json(
        { error: "This order has already been paid." },
        { status: 409 }
      );
    }

    if (order.currency !== "NGN") {
      return NextResponse.json(
        {
          error:
            "Paystack checkout is currently configured for NGN orders only.",
        },
        { status: 400 }
      );
    }

    const total = Number(order.total);
    const amountInKobo = Math.round(total * 100);

    if (
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isSafeInteger(amountInKobo) ||
      amountInKobo <= 0
    ) {
      return NextResponse.json(
        { error: "The order total is invalid." },
        { status: 400 }
      );
    }

    const email =
      typeof order.customer_email === "string" &&
      order.customer_email.includes("@")
        ? order.customer_email
        : user.email;

    if (!email) {
      return NextResponse.json(
        { error: "A valid customer email is required." },
        { status: 400 }
      );
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey || !secretKey.startsWith("sk_test_")) {
      return NextResponse.json(
        {
          error:
            "Paystack test mode is not configured. Check your server environment variables.",
        },
        { status: 500 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      return NextResponse.json(
        { error: "The site URL is not configured." },
        { status: 500 }
      );
    }

    // ---- The store must be active and must have a payout account ----
    if (!order.store_id) {
      return NextResponse.json(
        { error: "This order is not linked to a store." },
        { status: 400 }
      );
    }

    const { data: store } = await admin
      .from("stores")
      .select("id, is_active")
      .eq("id", order.store_id)
      .maybeSingle();

    if (!store || store.is_active === false) {
      return NextResponse.json(
        { error: "This store is not available right now." },
        { status: 400 }
      );
    }

    const { data: payoutAccount } = await admin
      .from("store_payout_accounts")
      .select("subaccount_code")
      .eq("store_id", order.store_id)
      .maybeSingle();

    if (!payoutAccount?.subaccount_code) {
      return NextResponse.json(
        {
          error:
            "This store has not finished setting up payments yet, so it cannot accept orders.",
          code: "store_payouts_not_ready",
        },
        { status: 400 }
      );
    }

    // ---- Work out the split ----
    const platformFeeKobo = calculatePlatformFeeKobo(amountInKobo);
    const reference = `SPURAX-${crypto.randomUUID()}`;

    // Save a pending payment record before contacting Paystack.
    const { error: paymentInsertError } = await admin
      .from("payments")
      .insert({
        order_id: order.id,
        provider: "paystack",
        provider_reference: reference,
        amount: total,
        currency: "NGN",
        status: "pending",
        metadata: {
          user_id: user.id,
          store_id: order.store_id,
          subaccount_code: payoutAccount.subaccount_code,
          platform_fee: platformFeeKobo / 100,
        },
      });

    if (paymentInsertError) {
      console.error(
        "Could not create payment record:",
        paymentInsertError.message
      );

      return NextResponse.json(
        { error: "Could not prepare the payment record." },
        { status: 500 }
      );
    }

    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          currency: "NGN",
          reference,
          callback_url: `${siteUrl.replace(/\/$/, "")}/api/payments/callback`,
          // Split: seller gets the rest, Spurax keeps only this flat fee,
          // and the seller carries Paystack's processing fee.
          subaccount: payoutAccount.subaccount_code,
          transaction_charge: platformFeeKobo,
          bearer: "subaccount",
          metadata: {
            order_id: order.id,
            user_id: user.id,
            store_id: order.store_id,
          },
        }),
        cache: "no-store",
      }
    );

    const result = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !result.status ||
      !result.data?.authorization_url ||
      result.data.reference !== reference
    ) {
      await admin
        .from("payments")
        .update({
          status: "failed",
          gateway_response: String(
            result.message || "Paystack initialization failed."
          ),
        })
        .eq("provider_reference", reference);

      return NextResponse.json(
        { error: "Paystack could not start this payment. Please try again." },
        { status: 502 }
      );
    }

    await admin
      .from("payments")
      .update({
        status: "processing",
        gateway_response: String(result.message || "Initialized"),
      })
      .eq("provider_reference", reference);

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);

    return NextResponse.json(
      { error: "Could not initialize payment. Please try again." },
      { status: 500 }
    );
  }
}