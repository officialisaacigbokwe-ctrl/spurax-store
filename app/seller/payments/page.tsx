"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";

type Bank = {
  name: string;
  code: string;
};

type Payout = {
  bank_name: string | null;
  account_name: string;
  account_last4: string;
};

export default function SellerPaymentsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [payout, setPayout] = useState<Payout | null>(null);

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankError, setBankError] = useState("");

  const [editing, setEditing] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to manage payments.");
        setLoading(false);
        return;
      }

      // Find the active store (it must be one the user owns)
      let activeId = getActiveStoreId();
      let store: { id: string; name: string } | null = null;

      if (activeId) {
        const { data } = await supabase
          .from("stores")
          .select("id, name")
          .eq("id", activeId)
          .eq("owner_id", user.id)
          .maybeSingle();

        store = data;
      }

      if (!store) {
        const { data } = await supabase
          .from("stores")
          .select("id, name")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        store = data;

        if (store) {
          setActiveStoreId(store.id);
        }
      }

      if (!store) {
        setLoading(false);
        return;
      }

      setStoreId(store.id);
      setStoreName(store.name);

      const { data: payoutData } = await supabase
        .from("store_payout_accounts")
        .select("bank_name, account_name, account_last4")
        .eq("store_id", store.id)
        .maybeSingle();

      setPayout(payoutData);

      // Load the list of banks for the dropdown
      try {
        const response = await fetch("/api/seller/payout");
        const result = await response.json();

        if (!response.ok) {
          setBankError(result?.error || "Could not load banks.");
        } else {
          setBanks(result.banks ?? []);
        }
      } catch {
        setBankError("Could not load banks.");
      }

      setLoading(false);
    }

    load();
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!storeId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/seller/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, bankCode, accountNumber }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error || "Could not save your account.");
        setSaving(false);
        return;
      }

      setPayout({
        bank_name: result.bankName || null,
        account_name: result.accountName,
        account_last4: result.last4,
      });

      setEditing(false);
      setBankCode("");
      setAccountNumber("");
      setSuccess("Your payout account has been connected.");
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm text-gray-500">Loading payments...</p>
        </div>
      </main>
    );
  }

  if (!storeId) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>

          <p className="mt-3 text-sm text-gray-500">
            {error || "You need a store before you can set up payments."}
          </p>

          <Link
            href="/create-store"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Create store
          </Link>
        </div>
      </main>
    );
  }

  const showForm = !payout || editing;

  return (
    <main>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {storeName || "SPURAX SELLER"}
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">Payments</h1>

        <p className="mt-2 max-w-2xl text-gray-500">
          Customer payments for your products go straight to your bank
          account. Spurax only keeps a small platform fee.
        </p>
      </div>

      {!payout && (
        <div className="mt-8 rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
          Add your payout account to start selling. Customers cannot buy
          from your store until this is done.
        </div>
      )}

      {success && (
        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {payout && !editing && (
        <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Connected account
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            {payout.account_name}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {payout.bank_name || "Bank account"} · ending in{" "}
            {payout.account_last4}
          </p>

          <div className="mt-5 inline-flex rounded-full bg-green-100 px-4 py-2 text-xs font-semibold text-green-700">
            Connected
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                setSuccess("");
                setEditing(true);
              }}
              className="rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              Change account
            </button>
          </div>
        </section>
      )}

      {showForm && (
        <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Payout account
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            {payout ? "Change your bank account" : "Connect your bank account"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Use the account where you want to receive your sales. We check the
            account with the bank and show you the account name.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="bank"
                className="mb-2 block text-sm font-medium"
              >
                Bank
              </label>

              <select
                id="bank"
                required
                value={bankCode}
                onChange={(event) => setBankCode(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-black"
              >
                <option value="">Select your bank</option>

                                {banks.map((bank, index) => (
                  <option key={`${bank.code}-${index}`} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>

              {bankError && (
                <p className="mt-2 text-xs text-red-600">{bankError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="accountNumber"
                className="mb-2 block text-sm font-medium"
              >
                Account number
              </label>

              <input
                id="accountNumber"
                type="text"
                inputMode="numeric"
                required
                maxLength={10}
                value={accountNumber}
                onChange={(event) =>
                  setAccountNumber(event.target.value.replace(/\D/g, ""))
                }
                placeholder="10-digit account number"
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving || accountNumber.length !== 10 || !bankCode}
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Checking account..." : "Save account"}
              </button>

              {payout && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError("");
                  }}
                  className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:border-black"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          How it works
        </p>

        <div className="mt-4 space-y-3 text-sm leading-6 text-gray-500">
          <p>
            When a customer pays, the money for your product goes to your bank
            account. Spurax only keeps its platform fee.
          </p>

          <p>
            Delivery is your responsibility. Spurax does not deliver orders
            for sellers yet.
          </p>
        </div>

        <Link
          href="/seller/orders"
          className="mt-6 inline-flex rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:border-black"
        >
          View orders
        </Link>
      </section>
    </main>
  );
}