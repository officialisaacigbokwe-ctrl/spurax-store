"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setActiveStoreId } from "@/lib/store-context";
import BrandLogo from "@/components/BrandLogo";

// Bump this when the Seller Agreement changes in a way sellers must re-accept.
const AGREEMENT_VERSION = "2026-10";
const MAX_STORES = 3;

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CreateStorePage() {
  const supabase = createClient();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [storeCount, setStoreCount] = useState(0);

  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/sign-in?next=/create-store");
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("store_memberships")
        .select("store_id, role")
        .eq("user_id", user.id)
        .eq("role", "owner");

      if (membershipError) {
        console.error("STORE MEMBERSHIP CHECK ERROR:", membershipError);
        setError(`Unable to check your stores: ${membershipError.message}`);
        setCheckingAuth(false);
        return;
      }

      const count = memberships?.length ?? 0;

      setStoreCount(count);

      if (count >= MAX_STORES) {
        setError(`You have reached the current limit of ${MAX_STORES} stores.`);
      }

      const { data: agreement } = await supabase
        .from("seller_agreements")
        .select("accepted_at")
        .eq("user_id", user.id)
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (agreement) {
        setAlreadyAccepted(true);
        setAcceptedAt(agreement.accepted_at);
      }

      setCheckingAuth(false);
    }

    checkUser();
  }, [router, supabase]);

  function handleStoreNameChange(value: string) {
    setStoreName(value);
    setSlug(createSlug(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!storeName.trim()) {
      setError("Please enter your store name.");
      return;
    }

    if (!slug.trim()) {
      setError("Please enter a valid store URL.");
      return;
    }

    if (storeCount >= MAX_STORES) {
      setError(`You have reached the current limit of ${MAX_STORES} stores.`);
      return;
    }

    if (!alreadyAccepted && !agreed) {
      setError("Please agree to the Seller Agreement and Terms to continue.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // 1. Check authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!user) {
        router.replace("/sign-in?next=/create-store");
        return;
      }

      // 2. Record the agreement (only the first time)
      if (!alreadyAccepted) {
        const { error: agreementError } = await supabase
          .from("seller_agreements")
          .upsert(
            { user_id: user.id, version: AGREEMENT_VERSION },
            { onConflict: "user_id,version", ignoreDuplicates: true }
          );

        if (agreementError) {
          console.error("AGREEMENT ERROR:", agreementError);
          throw new Error(
            "We could not record your agreement. Please try again."
          );
        }
      }

      // 3. Re-check owned stores before creating
      const { data: memberships, error: membershipCheckError } = await supabase
        .from("store_memberships")
        .select("store_id, role")
        .eq("user_id", user.id)
        .eq("role", "owner");

      if (membershipCheckError) {
        throw new Error(
          `Checking your stores failed: ${membershipCheckError.message}`
        );
      }

      if ((memberships?.length ?? 0) >= MAX_STORES) {
        throw new Error(
          `You have reached the current limit of ${MAX_STORES} stores.`
        );
      }

      // 4. Make sure the slug is not already being used
      const { data: existingSlug, error: slugCheckError } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", slug.trim())
        .maybeSingle();

      if (slugCheckError) {
        throw new Error(
          `Checking store URL failed: ${slugCheckError.message}`
        );
      }

      if (existingSlug) {
        throw new Error(
          "That store URL is already in use. Please choose another one."
        );
      }

      // 5. Create the new store
      const { data: store, error: storeError } = await supabase
        .from("stores")
        .insert({
          name: storeName.trim(),
          slug: slug.trim(),
          owner_id: user.id,
        })
        .select("id, name, slug")
        .single();

      if (storeError) {
        console.error("STORES INSERT ERROR:", storeError);

        throw new Error(
          storeError.code === "23505"
            ? "That store URL is already in use. Please choose another one."
            : `Creating store failed: ${storeError.message}`
        );
      }

      if (!store) {
        throw new Error("Store was not returned after creation.");
      }

      // 6. Create store membership
      const { error: membershipError } = await supabase
        .from("store_memberships")
        .insert({
          store_id: store.id,
          user_id: user.id,
          role: "owner",
        });

      if (membershipError) {
        console.error("STORE MEMBERSHIP INSERT ERROR:", membershipError);

        // Clean up the store if membership creation fails.
        await supabase.from("stores").delete().eq("id", store.id);

        throw new Error(
          `Creating store membership failed: ${membershipError.message}`
        );
      }

      // 7. Make the new store the active store
      setActiveStoreId(store.id);

      // 8. Next step: connect a bank account so the store can sell
      router.push("/seller/payments");
    } catch (err: any) {
      console.error("FULL CREATE STORE ERROR:", err);

      setError(
        err?.message ||
          err?.details ||
          err?.hint ||
          "Something went wrong while creating your store."
      );

      setCreating(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />

          <p className="mt-4 text-sm text-gray-500">Checking your account...</p>
        </div>
      </main>
    );
  }

  const blocked = creating || storeCount >= MAX_STORES;

  return (
    <main className="min-h-screen bg-[#f3f3f3]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center px-6 py-5">
          <BrandLogo />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-3xl bg-white p-8 shadow-sm md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Your Store
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            {storeCount === 0 ? "Create your store" : "Create another store"}
          </h1>

          <p className="mt-4 leading-7 text-gray-500">
            You can currently manage up to {MAX_STORES} stores from one Spurax
            account.
          </p>

          <div className="mt-6 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Stores created:{" "}
            <span className="font-semibold text-black">
              {storeCount} / {MAX_STORES}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div>
              <label
                htmlFor="storeName"
                className="mb-2 block text-sm font-medium"
              >
                Store name
              </label>

              <input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(event) => handleStoreNameChange(event.target.value)}
                placeholder="e.g. Soso Store"
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 outline-none transition focus:border-black"
                disabled={blocked}
              />
            </div>

            <div>
              <label htmlFor="slug" className="mb-2 block text-sm font-medium">
                Store address
              </label>

              <div className="flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-white focus-within:border-black">
                <span className="pl-4 text-sm text-gray-400">/store/</span>

                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(event) => setSlug(createSlug(event.target.value))}
                  placeholder="soso-store"
                  className="min-w-0 flex-1 bg-transparent px-2 py-3.5 outline-none"
                  disabled={blocked}
                />
              </div>
            </div>

            {alreadyAccepted ? (
              <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                You agreed to the Seller Agreement
                {acceptedAt
                  ? ` on ${new Date(acceptedAt).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}`
                  : ""}
                .
              </p>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  disabled={blocked}
                  className="mt-1.5 h-4 w-4 shrink-0"
                />

                <span>
                  I have read and agree to the{" "}
                  <a
                    href="/seller-agreement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-black underline underline-offset-4"
                  >
                    Seller Agreement
                  </a>{" "}
                  and the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-black underline underline-offset-4"
                  >
                    Terms of Service
                  </a>
                  . I understand that delivery is my responsibility and that I
                  must connect a payout account before I can sell.
                </span>
              </label>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={blocked}
              className="w-full rounded-full bg-black px-6 py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating
                ? "Creating store..."
                : storeCount >= MAX_STORES
                  ? "Store limit reached"
                  : "Create store"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}