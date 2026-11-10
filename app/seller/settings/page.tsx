"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SellerSettingsPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSeller() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setMessage("Please sign in to view your seller settings.");
        setLoading(false);
        return;
      }

      setEmail(user.email ?? "");
      setUserId(user.id);
      setLoading(false);
    }

    loadSeller();
  }, [supabase]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Could not sign out. Please try again.");
      return;
    }

    window.location.href = "/sign-in";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">
              Loading seller settings...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            SPURAX SELLER
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Settings
          </h1>

          <p className="mt-3 max-w-2xl text-gray-500">
            Manage your seller account and access your store configuration.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-600">
            {message}
          </div>
        )}

        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Account
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              Seller account
            </h2>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Email
                </p>

                <p className="mt-1 text-sm font-medium text-gray-800">
                  {email || "No email available"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Account ID
                </p>

                <p className="mt-1 break-all font-mono text-xs text-gray-500">
                  {userId || "Unavailable"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Store
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              Store configuration
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Store identity, branding, contact information, social links,
              currency, and language are managed separately.
            </p>

            <Link
              href="/seller/store"
              className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Manage Store
            </Link>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              Payments
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              Payment configuration
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Payment gateway and seller receiving configuration will be added
              here when payment processing is connected.
            </p>

            <Link
              href="/seller/payments"
              className="mt-6 inline-flex rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-black hover:text-black"
            >
              View Payments
            </Link>
          </section>

          <section className="rounded-3xl border border-red-100 bg-white p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
              Account actions
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              Sign out
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Sign out of your current Spurax account on this device.
            </p>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Sign Out
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

