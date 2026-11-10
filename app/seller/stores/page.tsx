"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getActiveStoreId,
  setActiveStoreId,
} from "@/lib/store-context";

type Store = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  default_currency: string | null;
  default_language: string | null;
};

type Membership = {
  store_id: string;
  role: string;
};

export default function SellerStoreHubPage() {
  const supabase = createClient();
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadStores() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/sign-in");
      return;
    }

    const { data: membershipData, error: membershipError } =
      await supabase
        .from("store_memberships")
        .select("store_id, role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (membershipError) {
      console.error(membershipError);
      setMessage("Could not load your stores.");
      setLoading(false);
      return;
    }

    const membershipList = membershipData ?? [];

    setMemberships(membershipList);

    if (membershipList.length === 0) {
      setStores([]);
      setLoading(false);
      return;
    }

    const storeIds = membershipList.map(
      (membership) => membership.store_id
    );

    const { data: storeData, error: storeError } =
      await supabase
        .from("stores")
        .select(
          "id, name, slug, description, logo_url, default_currency, default_language"
        )
        .in("id", storeIds)
        .order("created_at", { ascending: true });

    if (storeError) {
      console.error(storeError);
      setMessage("Could not load your store information.");
      setLoading(false);
      return;
    }

    const loadedStores = storeData ?? [];

    setStores(loadedStores);

    const activeStoreId = getActiveStoreId();

    if (
      !activeStoreId ||
      !loadedStores.some((store) => store.id === activeStoreId)
    ) {
      if (loadedStores[0]) {
        setActiveStoreId(loadedStores[0].id);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStores();
  }, []);

  function getRole(storeId: string) {
    return (
      memberships.find(
        (membership) => membership.store_id === storeId
      )?.role || "member"
    );
  }

  function handleManage(storeId: string) {
    setActiveStoreId(storeId);
    router.push("/seller/store/manage");
  }

  function handleSelect(storeId: string) {
    setActiveStoreId(storeId);
    router.push("/seller");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-gray-500">
            Loading your stores...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              SPURAX SELLER
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Your Stores
            </h1>

            <p className="mt-3 max-w-2xl text-gray-500">
              Manage your stores, switch between them, or create another
              store from the same Spurax account.
            </p>
          </div>

          <Link
            href="/create-store"
            className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Create New Store
          </Link>
        </div>

        {message && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {message}
          </div>
        )}

        {stores.length === 0 ? (
          <section className="mt-10 rounded-3xl border border-gray-200 bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold">
              You don't have a store yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              Create your first store to start selling products on
              Spurax.
            </p>

            <Link
              href="/create-store"
              className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              Create Your Store
            </Link>
          </section>
        ) : (
          <>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => {
                const activeStoreId = getActiveStoreId();
                const isActive = activeStoreId === store.id;

                return (
                  <article
                    key={store.id}
                    className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
                      isActive
                        ? "border-black"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="h-32 bg-gray-100">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl font-bold tracking-widest text-gray-300">
                          SPURAX
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-semibold">
                            {store.name}
                          </h2>

                          <p className="mt-1 truncate text-sm text-gray-400">
                            /{store.slug || "store"}
                          </p>
                        </div>

                        {isActive && (
                          <span className="shrink-0 rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="mt-4 text-sm text-gray-500">
                        {store.description ||
                          "Your Spurax marketplace store."}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="rounded-full bg-gray-100 px-3 py-1.5">
                          {getRole(store.id)}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1.5">
                          {store.default_currency || "NGN"}
                        </span>

                        <span className="rounded-full bg-gray-100 px-3 py-1.5">
                          {store.default_language || "English"}
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelect(store.id)}
                          className="rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold transition hover:border-black hover:bg-gray-50"
                        >
                          Use Store
                        </button>

                        <button
                          type="button"
                          onClick={() => handleManage(store.id)}
                          className="rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                        >
                          Manage
                        </button>
                      </div>

                      {store.slug && (
                        <Link
                          href={`/store/${store.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 block text-center text-sm font-medium text-gray-500 hover:text-black"
                        >
                          View public store →
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold">
                    Store limit
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    You currently have {stores.length} of 3 available
                    stores.
                  </p>
                </div>

                {stores.length < 3 ? (
                  <Link
                    href="/create-store"
                    className="rounded-full border border-black px-5 py-2.5 text-sm font-semibold transition hover:bg-black hover:text-white"
                  >
                    Create another store
                  </Link>
                ) : (
                  <span className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-500">
                    Current limit reached
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
