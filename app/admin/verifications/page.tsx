"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { namesMatch } from "@/lib/names";

type Item = {
  id: string;
  status: string;
  id_type: string;
  created_at: string;
  store_name: string;
};

type Detail = {
  verification: {
    id: string;
    status: string;
    id_type: string;
    rejection_reason: string | null;
    created_at: string;
    store_name: string;
    store_slug: string;
    owner_email: string;
    id_name: string | null;
    approved_level: string | null;
    has_cac: boolean;
    has_address: boolean;
    payout_account_name: string | null;
    payout_bank_name: string | null;
  };
  documents: { label: string; url: string; isPdf: boolean }[];
};

const ID_LABELS: Record<string, string> = {
  nin: "NIN",
  drivers_license: "Driver's licence",
  passport: "International passport",
  voters_card: "Voter's card",
};

const TABS = ["pending", "approved", "rejected"] as const;

export default function AdminVerificationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [items, setItems] = useState<Item[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [idName, setIdName] = useState("");
  const [level, setLevel] = useState<"identity" | "business">("identity");
  const [confirmMismatch, setConfirmMismatch] = useState(false);
  const [busy, setBusy] = useState(false);

  async function loadList(status = tab) {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/admin/verifications?status=${status}`);

    if (response.status === 403) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Could not load submissions.");
    } else {
      setItems(result.items ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadList(tab);
    setDetail(null);
  }, [tab]);

  async function open(id: string) {
    setError("");
    setReason("");
    setIdName("");
    setLevel("identity");
    setConfirmMismatch(false);

    const response = await fetch(`/api/admin/verifications?id=${id}`);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Could not open this submission.");
      return;
    }

    setDetail(result);
  }

  const payoutName = detail?.verification.payout_account_name || null;
  const typedName = idName.trim();

  const nameState: "unknown" | "match" | "mismatch" =
    !payoutName || typedName.length < 3
      ? "unknown"
      : namesMatch(typedName, payoutName)
        ? "match"
        : "mismatch";

  const canBusiness = Boolean(
    detail?.verification.has_cac && detail?.verification.has_address
  );

  async function decide(decision: "approve" | "reject") {
    if (!detail) return;

    if (
      decision === "approve" &&
      !window.confirm(
        "Approve this store? Only approve if the face matches the ID and the details are genuine."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    const response = await fetch("/api/admin/verifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: detail.verification.id,
        decision,
        reason,
        idName: typedName,
        level,
        confirmMismatch,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Could not save the decision.");
      setBusy(false);
      return;
    }

    setDetail(null);
    setReason("");
    setBusy(false);
    await loadList(tab);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
            href="/sign-in?next=/admin/verifications"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const approveDisabled =
    busy || typedName.length < 3 || (nameState === "mismatch" && !confirmMismatch);

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              SPURAX ADMIN
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Store verification
            </h1>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold transition hover:border-black"
          >
            ← Admin panel
          </Link>
        </div>

        <div className="mt-6 flex gap-2">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                tab === item
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white hover:border-black"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* LIST */}
          <section className="space-y-3">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : items.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
                Nothing in this tab.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => open(item.id)}
                  className={`block w-full rounded-3xl border bg-white p-5 text-left transition hover:border-black ${
                    detail?.verification.id === item.id
                      ? "border-black"
                      : "border-gray-200"
                  }`}
                >
                  <p className="font-semibold">{item.store_name}</p>

                  <p className="mt-1 text-xs text-gray-500">
                    {ID_LABELS[item.id_type] || item.id_type} ·{" "}
                    {formatDate(item.created_at)}
                  </p>
                </button>
              ))
            )}
          </section>

          {/* DETAIL */}
          <section>
            {!detail ? (
              <div className="rounded-3xl bg-white p-8 text-sm text-gray-500 shadow-sm">
                Choose a submission on the left to review it.
              </div>
            ) : (
              <div className="rounded-3xl bg-white p-7 shadow-sm">
                <h2 className="text-2xl font-semibold">
                  {detail.verification.store_name}
                </h2>

                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="text-gray-400">Owner email:</span>{" "}
                    {detail.verification.owner_email || "-"}
                  </p>
                  <p>
                    <span className="text-gray-400">ID type:</span>{" "}
                    {ID_LABELS[detail.verification.id_type] ||
                      detail.verification.id_type}
                  </p>
                  <p>
                    <span className="text-gray-400">Submitted:</span>{" "}
                    {formatDate(detail.verification.created_at)}
                  </p>

                  {detail.verification.id_name && (
                    <p>
                      <span className="text-gray-400">Name on ID:</span>{" "}
                      {detail.verification.id_name}
                    </p>
                  )}

                  {detail.verification.approved_level && (
                    <p>
                      <span className="text-gray-400">Level:</span>{" "}
                      {detail.verification.approved_level === "business"
                        ? "Business verified"
                        : "Identity verified"}
                    </p>
                  )}

                  {detail.verification.rejection_reason && (
                    <p>
                      <span className="text-gray-400">Reason given:</span>{" "}
                      {detail.verification.rejection_reason}
                    </p>
                  )}
                </div>

                <p className="mt-5 rounded-2xl bg-yellow-50 p-4 text-xs leading-5 text-yellow-800">
                  Check that the face in the selfie matches the ID photo, the
                  paper shows today&apos;s date and &quot;Spurax&quot;, and the ID
                  is readable and not expired. Document links expire after 5
                  minutes. Reopen the submission if an image stops loading.
                </p>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {detail.documents.map((doc) => (
                    <div key={doc.label}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {doc.label}
                      </p>

                      {doc.isPdf ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex rounded-full border border-gray-200 px-4 py-2 text-sm font-medium hover:border-black"
                        >
                          Open PDF
                        </a>
                      ) : (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={doc.url}
                            alt={doc.label}
                            className="mt-2 max-h-72 w-full rounded-2xl border border-gray-200 object-contain"
                          />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {detail.verification.status === "pending" && (
                  <div className="mt-8 border-t border-gray-100 pt-6">
                    {/* NAME CHECK */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">
                          Name on the ID (type it exactly)
                        </label>

                        <input
                          value={idName}
                          onChange={(event) => setIdName(event.target.value)}
                          placeholder="e.g. Amaka Okafor"
                          className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          Payout account name
                        </p>

                        <p className="mt-2 rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                          {payoutName || "No payout account connected yet"}
                        </p>

                        {detail.verification.payout_bank_name && (
                          <p className="mt-1 text-xs text-gray-400">
                            {detail.verification.payout_bank_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {nameState === "match" && (
                      <p className="mt-3 rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">
                        The names match.
                      </p>
                    )}

                    {nameState === "mismatch" && (
                      <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                        <p className="font-semibold">The names do not match.</p>

                        <p className="mt-1">
                          Check the spelling. If the payout account really
                          belongs to this person or their business, you can
                          confirm below.
                        </p>

                        <label className="mt-3 flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={confirmMismatch}
                            onChange={(event) =>
                              setConfirmMismatch(event.target.checked)
                            }
                            className="mt-1 h-4 w-4"
                          />
                          <span>
                            I checked, and the difference is acceptable.
                          </span>
                        </label>
                      </div>
                    )}

                    {nameState === "unknown" && !payoutName && (
                      <p className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                        This store has not connected a payout account yet, so
                        the name cannot be compared.
                      </p>
                    )}

                    {/* LEVEL */}
                    <div className="mt-6">
                      <p className="text-sm font-medium">Verification level</p>

                      <div className="mt-3 space-y-3">
                        <label className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4">
                          <input
                            type="radio"
                            name="level"
                            checked={level === "identity"}
                            onChange={() => setLevel("identity")}
                            className="mt-1"
                          />
                          <span className="text-sm">
                            <span className="font-semibold">
                              Identity verified
                            </span>
                            <span className="block text-gray-500">
                              Government ID and selfie checked.
                            </span>
                          </span>
                        </label>

                        <label
                          className={`flex items-start gap-3 rounded-2xl border border-gray-200 p-4 ${
                            canBusiness ? "" : "opacity-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="level"
                            checked={level === "business"}
                            disabled={!canBusiness}
                            onChange={() => setLevel("business")}
                            className="mt-1"
                          />
                          <span className="text-sm">
                            <span className="font-semibold">
                              Business verified
                            </span>
                            <span className="block text-gray-500">
                              Also checked: CAC registration and proof of
                              address.
                              {!canBusiness &&
                                " Not available: the seller did not submit both documents."}
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>

                    <textarea
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Reason (required only if you reject), e.g. The selfie is blurry"
                      rows={3}
                      className="mt-6 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black"
                    />

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={approveDisabled}
                        onClick={() => decide("approve")}
                        className="rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => decide("reject")}
                        className="rounded-full border border-red-300 px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}