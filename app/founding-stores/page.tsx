import Link from "next/link";
import type { Metadata } from "next";
import BrandLogo from "@/components/BrandLogo";
import FoundingBadge from "@/components/FoundingBadge";
import VerifiedBadge from "@/components/VerifiedBadge";
import { BRAND } from "@/lib/brand";
import { createPublicClient } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/journal";

export const metadata: Metadata = {
  title: `Founding Stores | ${BRAND.name}`,
  description:
    "Meet the first 50 stores that helped Spurax Global Marketplace begin.",
  alternates: { canonical: `${siteUrl()}/founding-stores` },
};

export default async function FoundingStoresPage() {
  const supabase = createPublicClient();

  const { data } = await supabase
    .from("stores")
    .select("id, name, slug, logo_url, founding_number")
    .not("founding_number", "is", null)
    .order("founding_number", { ascending: true });

  const stores = data ?? [];

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <BrandLogo />

          <Link
            href="/shop"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            Marketplace
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="bg-[#e6eee9] px-4 py-16 text-center sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <FoundingBadge size={96} className="mx-auto" />

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[#42594a]">
            Founding Stores
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            The first 50 stores.
          </h1>

          <p className="mt-4 text-base leading-7 text-gray-700">
            Some stores were here before the crowd. They believed in Spurax
            while it was still taking shape, and they helped us begin. We
            honour them with a badge that only we can give.
          </p>
        </div>
      </section>

      {/* WHAT IT IS */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="space-y-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              What is a Founding Store?
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              A Founding Store is one of the first 50 stores on Spurax Global
              Marketplace. Each one carries a grey-green badge, so shoppers can
              recognise it. Further down this page, every founding store is
              listed with its number, from 1 to 50.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              How does a store become one?
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              It cannot be applied for or bought. Spurax chooses and awards each
              Founding badge itself. There are only 50, and when they are
              given out, there will be no more.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              How is it different from the Verified badge?
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-6 rounded-3xl bg-[#fafafa] p-5">
              <div className="flex items-center gap-3">
                <VerifiedBadge size={44} />
                <span className="text-sm font-semibold">Verified (black)</span>
              </div>

              <div className="flex items-center gap-3">
                <FoundingBadge size={44} />
                <span className="text-sm font-semibold">
                  Founding (grey-green)
                </span>
              </div>
            </div>

            <p className="mt-4 leading-7 text-gray-600">
              The black <strong>Verified by Spurax</strong> badge means we
              checked the identity of the person behind a store. The grey-green{" "}
              <strong>Founding</strong> badge shows that a store was one of the
              first 50. They look alike on purpose, and the colour tells them
              apart. A store can have both.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              What it does not mean
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              The Founding badge is not a promise about any product. As with
              every store, please read the product details, and see our{" "}
              <Link href="/returns" className="underline">
                Returns and Refunds
              </Link>{" "}
              page if something goes wrong. We can remove the badge if a store
              breaks our rules.
            </p>
          </div>
        </div>
      </section>

      {/* THE STORES */}
      <section className="border-t border-gray-100 bg-[#fafafa] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold tracking-tight">
            Our founding stores
          </h2>

          {stores.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              The first founding stores will appear here soon.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="group rounded-3xl border border-gray-200 bg-white p-5 text-center transition hover:border-black"
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-[#f3f3f3]">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold tracking-wider text-gray-400">
                        {store.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <p className="mt-4 truncate font-semibold">{store.name}</p>

                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#e6eee9] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#42594a]">
                    <FoundingBadge size={14} />
                    No. {store.founding_number}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 py-14 text-center sm:px-6">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight">Join the story</h2>

          <p className="mt-3 text-sm leading-6 text-gray-600">
            Founding badges are not for sale, but every store has a place on
            Spurax. Open yours and start selling.
          </p>

          <Link
            href="/create-store"
            className="mt-6 inline-block rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Open your store
          </Link>
        </div>
      </section>
    </main>
  );
}