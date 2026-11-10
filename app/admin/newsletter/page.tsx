"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  email: string;
  created_at: string;
  unsubscribed_at: string | null;
};

export default function AdminNewsletterPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [active, setActive] = useState(0);
  const [unsubscribed, setUnsubscribed] = useState(0);
  const [latest, setLatest] = useState<Row[]>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/newsletter");

      if (response.status === 403) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const result = await response.json().catch(() => null);

      setActive(result?.active ?? 0);
      setUnsubscribed(result?.unsubscribed ?? 0);
      setLatest(result?.latest ?? []);
      setLoading(false);
    }

    load();
  }, []);

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
            href="/sign-in?next=/admin/newsletter"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/admin"
          className="text-sm font-medium text-gray-500 hover:text-black"
        >
          ← Admin panel
        </Link>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Newsletter</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Subscribers</p>
            <p className="mt-2 text-3xl font-bold">{active}</p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Unsubscribed</p>
            <p className="mt-2 text-3xl font-bold">{unsubscribed}</p>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/api/admin/newsletter?format=csv"
            className="inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Download subscribers (CSV)
          </a>

          <p className="mt-3 text-xs leading-5 text-gray-500">
            The file lists current subscribers only. Please do not email people
            who unsubscribed. Gmail is not built for mass mailing, so send in
            small batches until we add a proper email service.
          </p>
        </div>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Latest sign-ups</h2>

          {latest.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No sign-ups yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-gray-100">
              {latest.map((row) => (
                <div
                  key={row.email}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <span className="min-w-0 truncate">{row.email}</span>

                  <span className="shrink-0 text-xs text-gray-400">
                    {row.unsubscribed_at
                      ? "Unsubscribed"
                      : new Date(row.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}