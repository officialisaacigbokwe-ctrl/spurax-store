"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminInfo = {
  isAdmin: boolean;
  pendingVerifications: number;
};

export default function AdminHomePage() {
  const [info, setInfo] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((response) => response.json())
      .then((data) =>
        setInfo({
          isAdmin: data?.isAdmin === true,
          pendingVerifications: Number(data?.pendingVerifications) || 0,
        })
      )
      .catch(() => setInfo({ isAdmin: false, pendingVerifications: 0 }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!info?.isAdmin) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-6 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Not allowed</h1>

          <p className="mt-3 text-sm text-gray-500">
            This area is for Spurax admins only. Sign in with an admin account.
          </p>

          <Link
            href="/sign-in?next=/admin"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const pending = info.pendingVerifications;

  const tiles = [
    {
      href: "/admin/founding",
      title: "Founding stores",
      text: "Give the Founding badge to the first 50 stores.",
    },
    {
      href: "/admin/site",
      title: "Site content",
      text: "Announcement bar, home page ad board, social links and footer links.",
    },
    {
      href: "/admin/journal",
      title: "Journal",
      text: "Write, edit and publish articles, guides and stories.",
    },
    {
      href: "/admin/newsletter",
      title: "Newsletter",
      text: "See subscribers and download the list.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          SPURAX ADMIN
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">Admin panel</h1>

        <p className="mt-2 text-gray-500">
          Manage verification, founding stores, the Journal, the newsletter and
          the site content.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Link
            href="/admin/verifications"
            className="rounded-3xl bg-black p-7 text-white transition hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Verifications</p>

              {pending > 0 && (
                <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-semibold">
                  {pending} to review
                </span>
              )}
            </div>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Review seller IDs and selfies, then approve or reject the
              Verified by Spurax badge.
            </p>

            <p className="mt-6 text-sm font-semibold">Open →</p>
          </Link>

          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="rounded-3xl bg-white p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-lg font-semibold">{tile.title}</p>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                {tile.text}
              </p>

              <p className="mt-6 text-sm font-semibold">Open →</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-gray-200 pt-6 text-sm">
          {[
            ["/seller", "Seller center"],
            ["/shop", "Marketplace"],
            ["/journal", "Public Journal"],
            ["/founding-stores", "Founding stores page"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full border border-gray-200 bg-white px-5 py-2.5 font-medium transition hover:border-black"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}