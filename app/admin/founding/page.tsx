"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FoundingBadge from "@/components/FoundingBadge";

type Founding = {
  id: string;
  name: string;
  slug: string;
  founding_number: number;
  is_active: boolean;
};

type Result = {
  id: string;
  name: string;
  slug: string;
  founding_number: number | null;
  is_verified: boolean;
};

export default function AdminFoundingPage() {
  const [founding, setFounding] = useState<Founding[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [limit, setLimit] = useState(50);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function load(search = query) {
    const response = await fetch(
      `/api/admin/founding?q=${encodeURIComponent(search)}`
    );

    if (response.status === 403) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const result = await response.json().catch(() => null);

    setFounding(result?.founding ?? []);
    setResults(result?.results ?? []);
    setLimit(result?.limit ?? 50);
    setLoading(false);
  }

  useEffect(() => {
    load("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(query), 300);

    return () => clearTimeout(timer);
  }, [query]);

  async function act(storeId: string, action: "grant" | "revoke", name: string) {
    if (
      action === "revoke" &&
      !window.confirm(`Remove the Founding badge from ${name}?`)
    ) {
      return;
    }

    setBusy(storeId);
    setMessage(null);

    const response = await fetch("/api/admin/founding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, action }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage({ ok: false, text: result?.error || "Something went wrong." });
    } else {
      setMessage({
        ok: true,
        text:
          action === "grant"
            ? `${name} is now Founding Store No. ${result.number}.`
            : `${name} is no longer a founding store.`,
      });

      await load(query);
    }

    setBusy(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-6 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Not allowed</h1>

          <p className="mt-3 text-sm text-gray-500">
            This page is for Spurax admins only. Sign in with an admin account.
          </p>

          <Link
            href="/sign-in?next=/admin/founding"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const full = founding.length >= limit;

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/admin"
          className="text-sm font-medium text-gray-500 hover:text-black"
        >
          ← Admin panel
        </Link>

        <div className="mt-6 flex items-center gap-4">
          <FoundingBadge size={56} />

          <div>
            <h1 className="text-3xl font-bold tracking-tight">Founding stores</h1>

            <p className="mt-1 text-sm text-gray-500">
              {founding.length} of {limit} founding spots used
              {full ? ". All spots are taken." : "."}
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              message.ok
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* GRANT */}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Give the badge to a store</h2>

          <p className="mt-1 text-sm text-gray-500">
            Search by store name. The next free number is given automatically.
          </p>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type at least 2 letters of the store name"
            className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
          />

          {query.trim().length >= 2 && (
            <div className="mt-4 divide-y divide-gray-100">
              {results.length === 0 ? (
                <p className="py-3 text-sm text-gray-500">No store found.</p>
              ) : (
                results.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{store.name}</p>

                      <p className="text-xs text-gray-400">
                        /store/{store.slug}
                        {store.is_verified ? " · Verified" : ""}
                      </p>
                    </div>

                    {store.founding_number ? (
                      <span className="shrink-0 rounded-full bg-[#e6eee9] px-3 py-1 text-xs font-semibold text-[#42594a]">
                        Founding No. {store.founding_number}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === store.id || full}
                        onClick={() => act(store.id, "grant", store.name)}
                        className="shrink-0 rounded-full bg-black px-5 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-40"
                      >
                        Give badge
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* CURRENT */}
        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Current founding stores</h2>

          {founding.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">None yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-gray-100">
              {founding.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e6eee9] text-xs font-bold text-[#42594a]">
                      {store.founding_number}
                    </span>

                    <div className="min-w-0">
                      <Link
                        href={`/store/${store.slug}`}
                        target="_blank"
                        className="block truncate font-medium hover:underline"
                      >
                        {store.name}
                      </Link>

                      {!store.is_active && (
                        <p className="text-xs text-yellow-700">
                          Store is currently inactive
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy === store.id}
                    onClick={() => act(store.id, "revoke", store.name)}
                    className="shrink-0 rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}