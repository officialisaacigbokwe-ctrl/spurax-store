import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key && key.startsWith("sk_test_") ? key : null;
}

// GET: list of Nigerian banks for the dropdown
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const secretKey = getSecretKey();

  if (!secretKey) {
    return NextResponse.json(
      { error: "Paystack test mode is not configured." },
      { status: 500 }
    );
  }

  const response = await fetch(
    "https://api.paystack.co/bank?country=nigeria&perPage=200",
    {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    }
  );

  const result = await response.json();

  if (!response.ok || !result.status || !Array.isArray(result.data)) {
    return NextResponse.json(
      { error: "Could not load the bank list." },
      { status: 502 }
    );
  }

    const seen = new Set<string>();

  const banks = (result.data as { name: string; code: string; active?: boolean }[])
    .filter((bank) => bank.code && bank.active !== false)
    .filter((bank) => {
      if (seen.has(bank.code)) return false;
      seen.add(bank.code);
      return true;
    })
    .map((bank) => ({ name: bank.name, code: bank.code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ banks });
}

// POST: connect (or update) a store's payout bank account
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    const bankCode = typeof body?.bankCode === "string" ? body.bankCode : "";
    const accountNumber =
      typeof body?.accountNumber === "string" ? body.accountNumber.trim() : "";

    if (!storeId || !bankCode || !/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Choose a bank and enter a valid 10-digit account number." },
        { status: 400 }
      );
    }

    // Only the owner of the store may set its payout account
    const { data: store } = await admin
      .from("stores")
      .select("id, name, owner_id")
      .eq("id", storeId)
      .maybeSingle();

    if (!store || store.owner_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have access to this store." },
        { status: 403 }
      );
    }

    const secretKey = getSecretKey();

    if (!secretKey) {
      return NextResponse.json(
        { error: "Paystack test mode is not configured." },
        { status: 500 }
      );
    }

    const paystackHeaders = {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    };

    // 1. Confirm the account exists and get the real account name
    const resolveResponse = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
        accountNumber
      )}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${secretKey}` }, cache: "no-store" }
    );

    const resolved = await resolveResponse.json();

    if (!resolveResponse.ok || !resolved.status || !resolved.data?.account_name) {
      return NextResponse.json(
        {
          error:
            resolved?.message ||
            "We could not verify this bank account. Check the details and try again.",
        },
        { status: 400 }
      );
    }

    const accountName = String(resolved.data.account_name);

    // 2. Create the Paystack subaccount (or update the existing one)
    const { data: existing } = await admin
      .from("store_payout_accounts")
      .select("subaccount_code")
      .eq("store_id", store.id)
      .maybeSingle();

    const subaccountPayload = {
      business_name: store.name,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: 0,
    };

    const subaccountResponse = await fetch(
      existing?.subaccount_code
        ? `https://api.paystack.co/subaccount/${encodeURIComponent(
            existing.subaccount_code
          )}`
        : "https://api.paystack.co/subaccount",
      {
        method: existing?.subaccount_code ? "PUT" : "POST",
        headers: paystackHeaders,
        body: JSON.stringify(subaccountPayload),
        cache: "no-store",
      }
    );

    const subaccount = await subaccountResponse.json();

    if (
      !subaccountResponse.ok ||
      !subaccount.status ||
      !subaccount.data?.subaccount_code
    ) {
      console.error("Subaccount error:", subaccount?.message);

      return NextResponse.json(
        { error: "Paystack could not connect this account. Please try again." },
        { status: 502 }
      );
    }

    const bankName = String(subaccount.data.settlement_bank || "");

    // 3. Save only what we need
    const { error: saveError } = await admin
      .from("store_payout_accounts")
      .upsert(
        {
          store_id: store.id,
          provider: "paystack",
          subaccount_code: String(subaccount.data.subaccount_code),
          bank_code: bankCode,
          bank_name: bankName,
          account_name: accountName,
          account_last4: accountNumber.slice(-4),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" }
      );

    if (saveError) {
      console.error("Payout save error:", saveError.message);

      return NextResponse.json(
        { error: "Could not save the payout account." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      accountName,
      bankName,
      last4: accountNumber.slice(-4),
    });
  } catch (error) {
    console.error("Payout setup error:", error);

    return NextResponse.json(
      { error: "Could not set up the payout account." },
      { status: 500 }
    );
  }
}