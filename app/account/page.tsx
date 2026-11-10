"use client";
import BrandLogo from "@/components/BrandLogo";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AdminButton from "@/components/AdminButton";

type Profile = {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
};

type Store = {
  id: string;
  name: string;
  slug: string;
};

export default function AccountPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/sign-in");
          return;
        }

        setEmail(user.email ?? "");

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        setProfile(profileData);

        const { data: memberships, error: membershipError } =
          await supabase
            .from("store_memberships")
            .select("store_id")
            .eq("user_id", user.id);

        if (membershipError) {
          console.error("ACCOUNT STORE MEMBERSHIPS ERROR:", membershipError);
          setStores([]);
          return;
        }

        const storeIds = [
          ...new Set(
            (memberships ?? []).map((membership) => membership.store_id)
          ),
        ];

        if (storeIds.length === 0) {
          setStores([]);
          return;
        }

        const { data: storeData, error: storeError } = await supabase
          .from("stores")
          .select("id, name, slug")
          .in("id", storeIds)
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (storeError) {
          console.error("ACCOUNT STORES ERROR:", storeError);
          setStores([]);
          return;
        }

        setStores(storeData ?? []);
      } catch (error) {
        console.error("ACCOUNT LOAD ERROR:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [router, supabase]);

  function openSellerCenter() {
    router.push(stores.length > 0 ? "/seller/store" : "/create-store");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/sign-in");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3]">
        <p className="text-sm text-gray-500">Loading your account...</p>
      </main>
    );
  }

  const primaryStore = stores[0] ?? null;

  return (
    <main className="min-h-screen bg-[#f3f3f3]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo />

          <button
            onClick={handleSignOut}
            className="rounded-full border border-gray-200 px-5 py-2.5 text-sm font-medium transition hover:bg-black hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>
            <AdminButton variant="bar" />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            My account
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Welcome, {profile?.full_name || "Spurax customer"}.
          </h1>

          <p className="mt-3 text-gray-500">
            Manage your profile, orders and Spurax experience.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg text-white">
              👤
            </div>

            <h2 className="mt-6 text-xl font-semibold">Profile</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Manage your personal information and account details.
            </p>

            <div className="mt-6 space-y-2 text-sm">
              <p>
                <span className="font-medium">Name:</span>{" "}
                {profile?.full_name || "Not added"}
              </p>

              <p>
                <span className="font-medium">Email:</span> {email}
              </p>

              <p>
                <span className="font-medium">Phone:</span>{" "}
                {profile?.phone || "Not added"}
              </p>
            </div>

            <a
              href="/edit-profile"
              className="mt-6 inline-block rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Edit profile
            </a>
          </div>

          {/* Your Store */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg text-white">
              🏪
            </div>

            <h2 className="mt-6 text-xl font-semibold">Your Store</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {stores.length > 0
                ? `You have ${stores.length} store${stores.length === 1 ? "" : "s"} connected to your account.`
                : "Create your own store and start adding products."}
            </p>

            {primaryStore && (
              <div className="mt-6">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-gray-400">
                  {stores.length > 1 ? "One of your stores" : "Your store"}
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {primaryStore.name}
                </p>

                {stores.length > 1 && (
                  <p className="mt-1 text-sm text-gray-500">
                    + {stores.length - 1} more
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={openSellerCenter}
              className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              {stores.length > 0 ? "Manage stores" : "Create your store"}
            </button>
          </div>

          {/* Sell on Spurax */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg text-white">
              ✦
            </div>

            <h2 className="mt-6 text-xl font-semibold">Sell on Spurax</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Start selling on the Spurax marketplace, or return to your seller
              workspace to manage your existing stores, products and orders.
            </p>

            <button
              type="button"
              onClick={openSellerCenter}
              className="mt-6 inline-flex rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              {stores.length > 0 ? "Open Seller Center" : "Start selling"}
            </button>
          </div>

          {/* Orders */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg text-white">
              📦
            </div>

            <h2 className="mt-6 text-xl font-semibold">Orders</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              View your purchases, payment status and delivery updates.
            </p>

            <a
              href="/orders"
              className="mt-6 inline-block rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              View orders
            </a>
          </div>

          {/* Addresses */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg text-white">
              📍
            </div>

            <h2 className="mt-6 text-xl font-semibold">Addresses</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Save and manage your delivery addresses for faster checkout.
            </p>

            <a
              href="/addresses"
              className="mt-6 inline-block rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              Manage addresses
            </a>
          </div>

          {/* Saved items */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg text-white">
              ♥
            </div>

            <h2 className="mt-6 text-xl font-semibold">Saved items</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Keep products you love saved for later.
            </p>

            <button
              type="button"
              className="mt-6 rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              View saved items
            </button>
          </div>

          {/* Settings */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-lg text-white">
              ⚙️
            </div>

            <h2 className="mt-6 text-xl font-semibold">Settings</h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Manage your account preferences and security.
            </p>

                        <a
              href="/settings"
              className="mt-6 inline-block rounded-full border border-gray-200 px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
            >
              Account settings
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
