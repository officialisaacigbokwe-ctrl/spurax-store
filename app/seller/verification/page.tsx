"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";
import VerifiedBadge from "@/components/VerifiedBadge";

type Verification = {
  id: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

const ID_TYPES = [
  { value: "nin", label: "NIN slip or card" },
  { value: "drivers_license", label: "Driver's licence" },
  { value: "passport", label: "International passport" },
  { value: "voters_card", label: "Voter's card" },
];

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

export default function SellerVerificationPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [latest, setLatest] = useState<Verification | null>(null);

  const [idType, setIdType] = useState("nin");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const [cac, setCac] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please sign in.");
      setLoading(false);
      return;
    }

    type StoreRow = { id: string; name: string; is_verified: boolean };
    let store: StoreRow | null = null;
    const activeId = getActiveStoreId();

    if (activeId) {
      const { data } = await supabase
        .from("stores")
        .select("id, name, is_verified")
        .eq("id", activeId)
        .eq("owner_id", user.id)
        .maybeSingle();

      store = data;
    }

    if (!store) {
      const { data } = await supabase
        .from("stores")
        .select("id, name, is_verified")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      store = data;

      if (store) {
        setActiveStoreId(store.id);
      }
    }

    if (store) {
      setStoreId(store.id);
      setStoreName(store.name);
      setIsVerified(store.is_verified);

      const { data: row } = await supabase
        .from("store_verifications")
        .select("id, status, rejection_reason, created_at")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatest(row);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function pick(setter: (file: File | null) => void) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;

      if (!file) {
        setter(null);
        return;
      }

      if (!ALLOWED.includes(file.type)) {
        setError("Please choose a JPG, PNG, WebP or PDF file.");
        event.target.value = "";
        setter(null);
        return;
      }

      if (file.size > MAX_SIZE) {
        setError("Each file must be 5 MB or smaller.");
        event.target.value = "";
        setter(null);
        return;
      }

      setError("");
      setter(file);
    };
  }

  async function upload(kind: string, file: File) {
    const extension =
      (file.name.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 5) || "jpg";

    const path = `${storeId}/${Date.now()}-${kind}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("verification-docs")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new Error(`Could not upload your ${kind} file. Please try again.`);
    }

    return path;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!storeId) return;

    if (!idFront || !selfie) {
      setError("Please add your ID and your selfie holding the ID.");
      return;
    }

    if (!consent) {
      setError("Please tick the declaration to continue.");
      return;
    }

    setSaving(true);

    try {
      const idFrontPath = await upload("id-front", idFront);
      const idBackPath = idBack ? await upload("id-back", idBack) : "";
      const selfiePath = await upload("selfie", selfie);
      const addressProofPath = addressProof
        ? await upload("address", addressProof)
        : "";
      const cacPath = cac ? await upload("cac", cac) : "";

      const response = await fetch("/api/seller/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          idType,
          idFrontPath,
          idBackPath,
          selfiePath,
          addressProofPath,
          cacPath,
          consent: true,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not submit. Please try again.");
      }

      setIdFront(null);
      setIdBack(null);
      setSelfie(null);
      setAddressProof(null);
      setCac(null);
      setConsent(false);

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm text-gray-500">Loading verification...</p>
        </div>
      </main>
    );
  }

  if (!storeId) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Verification</h1>

          <p className="mt-3 text-sm text-gray-500">
            {error || "You need a store before you can apply for verification."}
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

  const showForm = !isVerified && latest?.status !== "pending";
  const inputClass =
    "mt-2 block w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm";

  return (
    <main>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {storeName}
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Store verification
        </h1>

        <p className="mt-2 max-w-2xl text-gray-500">
          A verified store shows the Spurax badge, which helps customers trust
          you.
        </p>
      </div>

      {isVerified && (
        <section className="mt-8 flex items-center gap-4 rounded-3xl bg-white p-7 shadow-sm">
          <VerifiedBadge size={56} />

          <div>
            <h2 className="text-xl font-semibold">Your store is verified</h2>

            <p className="mt-1 text-sm text-gray-500">
              The Spurax badge now shows on your store.
            </p>
          </div>
        </section>
      )}

      {!isVerified && latest?.status === "pending" && (
        <section className="mt-8 rounded-3xl border border-yellow-200 bg-yellow-50 p-7">
          <h2 className="text-xl font-semibold text-yellow-900">
            Under review
          </h2>

          <p className="mt-2 text-sm leading-6 text-yellow-800">
            We received your documents on{" "}
            {new Date(latest.created_at).toLocaleDateString("en-NG", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            . We will email you when the review is done.
          </p>
        </section>
      )}

      {!isVerified && latest?.status === "rejected" && (
        <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-7">
          <h2 className="text-xl font-semibold text-red-900">
            Your last submission was not approved
          </h2>

          <p className="mt-2 text-sm leading-6 text-red-800">
            {latest.rejection_reason || "Please check your documents and try again."}
          </p>

          <p className="mt-2 text-sm text-red-800">
            You can submit again below.
          </p>
        </section>
      )}

      {showForm && (
        <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm">
          <h2 className="text-xl font-semibold">Submit your documents</h2>

          <div className="mt-4 rounded-2xl bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            <p className="font-semibold text-gray-800">Before you start</p>

            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Use clear, well-lit photos. All the text must be readable.</li>
              <li>
                For the selfie, hold your ID next to your face. Also hold a
                paper with today&apos;s date and the word &quot;Spurax&quot;
                written on it.
              </li>
              <li>Files can be JPG, PNG, WebP or PDF, up to 5 MB each.</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <div>
              <label className="text-sm font-medium">Type of ID</label>

              <select
                value={idType}
                onChange={(event) => setIdType(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
              >
                {ID_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">
                ID, front <span className="text-red-600">*</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={pick(setIdFront)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                ID, back (if it has one)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={pick(setIdBack)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Selfie holding your ID <span className="text-red-600">*</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={pick(setSelfie)}
                className={inputClass}
              />
            </div>

            <div className="border-t border-gray-100 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Optional, for businesses
              </p>

              <div className="mt-4 space-y-6">
                <div>
                  <label className="text-sm font-medium">Proof of address</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={pick(setAddressProof)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    CAC registration document
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={pick(setCac)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1.5 h-4 w-4 shrink-0"
              />

              <span>
                I confirm these documents are mine and genuine, and I agree
                that Spurax may review them to verify my identity. They are
                stored privately and only seen by Spurax staff who review
                them. See our{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-black underline underline-offset-4"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Uploading..." : "Submit for review"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}