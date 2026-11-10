"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getActiveStoreId,
  setActiveStoreId,
} from "@/lib/store-context";


type Store = {
  id: string;
  name: string;
  slug: string | null;
  description?: string | null;
  is_active?: boolean;
};

export default function SellerStorePage() {
  const supabase = createClient();
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStore] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStores() {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: memberships, error: membershipError } =
          await supabase
            .from("store_memberships")
            .select("store_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });

        if (membershipError) {
          console.error(
            "STORE MEMBERSHIPS ERROR:",
            membershipError
          );
          setLoading(false);
          return;
        }

        const storeIds =
          memberships?.map((membership) => membership.store_id) ?? [];

        if (storeIds.length === 0) {
          setStores([]);
          setLoading(false);
          return;
        }

        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select(
            "id, name, slug, description, is_active"
          )
          .in("id", storeIds)
          .order("created_at", { ascending: true });

        if (storeError) {
          console.error("STORES ERROR:", storeError);
          setLoading(false);
          return;
        }

        const loadedStores = storeData ?? [];

        setStores(loadedStores);

        let currentActiveStoreId = getActiveStoreId();

        const activeStoreExists = loadedStores.some(
          (store) => store.id === currentActiveStoreId
        );

        if (!activeStoreExists) {
          currentActiveStoreId =
            loadedStores.length > 0
              ? loadedStores[0].id
              : null;

          if (currentActiveStoreId) {
            setActiveStoreId(currentActiveStoreId);
          }
        }

        setActiveStore(currentActiveStoreId);
      } catch (error) {
        console.error("SELLER STORE ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStores();
  }, []);

  function useStore(storeId: string) {
    setActiveStoreId(storeId);
    setActiveStore(storeId);
  }

  function manageStore(storeId: string) {
  setActiveStoreId(storeId);
  setActiveStore(storeId);
  router.push("/seller/store/manage");
}

  if (loading) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm text-gray-500">
            Loading your stores...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            SPURAX SELLER CENTER
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Store Management
          </h1>

          <p className="mt-2 max-w-2xl text-gray-500">
            Create, manage and switch between your Spurax stores.
          </p>
        </div>

        <Link
          href="/create-store"
          className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
        >
          + Create New Store
        </Link>
      </div>

      {/* STORE COUNT */}
      <section className="mt-8 rounded-3xl bg-black p-6 text-white md:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              YOUR STORES
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              {stores.length} / 3 stores created
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              You can currently create up to three stores on
              your Spurax account.
            </p>
          </div>

          <Link
            href="/create-store"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
          >
            + Create Store
          </Link>
        </div>
      </section>

      {/* EMPTY STATE */}
      {stores.length === 0 && (
        <section className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            NO STORES YET
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Create your first store
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-500">
            Start your marketplace journey by creating a store
            and adding your first products.
          </p>

          <Link
            href="/create-store"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Create Store
          </Link>
        </section>
      )}

      {/* STORES */}
      {stores.length > 0 && (
        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">
              Your Stores
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Choose a store to manage or make active.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {stores.map((store) => {
              const isActive = store.id === activeStoreId;

              return (
                <div
                  key={store.id}
                  className={`rounded-3xl bg-white p-6 shadow-sm transition ${
                    isActive
                      ? "ring-2 ring-black"
                      : "hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  {/* CARD HEADER */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold">
                          {store.name}
                        </h3>

                        {isActive && (
                          <span className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                            Active
                          </span>
                        )}
                      </div>

                      {store.slug && (
                        <p className="mt-1 text-sm text-gray-400">
                          spurax.com/store/{store.slug}
                        </p>
                      )}
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-sm font-bold">
                      S
                    </div>
                  </div>

                  {/* DESCRIPTION */}
                  <p className="mt-5 min-h-[48px] text-sm leading-6 text-gray-500">
                    {store.description ||
                      "No store description has been added yet."}
                  </p>

                  {/* ACTIONS */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
  type="button"
  onClick={() => manageStore(store.id)}
  className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
>
  Manage
</button>

                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => useStore(store.id)}
                        className="inline-flex items-center justify-center rounded-full border border-black px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
                      >
                        Use Store
                      </button>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-400">
                        Currently Active
                      </span>
                    )}

                    {store.slug && (
                      <Link
                        href={`/store/${store.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-black hover:text-black"
                      >
                        View Store
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* BOTTOM CREATE */}
      {stores.length > 0 && stores.length < 3 && (
        <section className="mt-8 rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">
            Want another store?
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            You have {3 - stores.length} store slot
            {3 - stores.length === 1 ? "" : "s"} remaining.
          </p>

          <Link
            href="/create-store"
            className="mt-5 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            + Create Another Store
          </Link>
        </section>
      )}
    </main>
  );
}
