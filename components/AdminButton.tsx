"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AdminInfo = {
  isAdmin: boolean;
  pendingVerifications: number;
};

// Renders nothing at all unless the signed-in user is a Spurax admin.
export default function AdminButton({
  variant = "pill",
  onNavigate,
}: {
  variant?: "pill" | "bar" | "link" | "menu" | "tab" | "inline";
  onNavigate?: () => void;
}) {
  const [info, setInfo] = useState<AdminInfo | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/me")
      .then((response) => response.json())
      .then((data) => {
        if (active) {
          setInfo({
            isAdmin: data?.isAdmin === true,
            pendingVerifications: Number(data?.pendingVerifications) || 0,
          });
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  if (!info?.isAdmin) {
    return null;
  }

  const pending = info.pendingVerifications;

  const badge =
    pending > 0 ? (
      <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
        {pending}
      </span>
    ) : null;

  if (variant === "menu") {
    return (
      <Link
        href="/admin"
        onClick={onNavigate}
        className="mt-1 block rounded-xl bg-black px-4 py-3 text-white transition hover:bg-gray-800"
      >
        <span className="flex items-center justify-between text-sm font-semibold">
          Admin panel
          {badge}
        </span>

        <span className="mt-1 block text-xs text-white/60">
          Verification, Journal and site content
        </span>
      </Link>
    );
  }

  if (variant === "bar") {
    return (
      <div className="bg-black text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5 text-xs">
          <span className="text-gray-300">Signed in as a Spurax admin</span>

          <Link href="/admin" className="font-semibold hover:underline">
            Open admin panel
            {pending > 0 ? ` · ${pending} to review` : ""} →
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "link") {
    return (
      <li>
        <Link
          href="/admin"
          className="text-gray-400 transition hover:text-white"
        >
          Admin panel
          {badge}
        </Link>
      </li>
    );
  }

  if (variant === "tab") {
    return (
      <Link
        href="/admin"
        className="shrink-0 rounded-full border border-black px-4 py-2 text-sm font-medium text-black"
      >
        Admin
        {badge}
      </Link>
    );
  }

  if (variant === "inline") {
    return (
      <Link
        href="/admin"
        className="text-sm text-gray-300 transition hover:text-white"
      >
        Admin
        {badge}
      </Link>
    );
  }

  return (
    <Link
      href="/admin"
      className="inline-flex items-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
    >
      Admin
      {badge}
    </Link>
  );
}