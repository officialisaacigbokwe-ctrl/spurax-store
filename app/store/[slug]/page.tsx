"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import VerifiedBadge from "@/components/VerifiedBadge";
import FoundingBadge from "@/components/FoundingBadge";
import SocialIcon, { SocialName } from "@/components/SocialIcon";

type Store = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  default_currency: string | null;
  default_language: string | null;
  is_verified: boolean;
  verification_level: string | null;
  verified_at: string | null;
  created_at: string;
  payouts_ready: boolean;
  founding_number: number | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  image_url: string | null;
  is_featured: boolean;
};

const STORE_COLUMNS =
  "id, name, slug, description, logo_url, banner_url, address, city, state, country, postal_code, contact_email, contact_phone, website_url, instagram_url, facebook_url, tiktok_url, x_url, youtube_url, default_currency, default_language, is_verified, verification_level, verified_at, created_at, payouts_ready, founding_number";

export default function StorePage() {
  const params = useParams();
  const slug = params.slug as string;

  const supabase = createClient();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadStore() {
      setLoading(true);
      setErrorMessage("");

      const { data: storeData, error: storeError } = await supabase
        .from("stores")
        .select(STORE_COLUMNS)
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (storeError || !storeData) {
        setErrorMessage("Store not found.");
        setLoading(false);
        return;
      }

      setStore(storeData as Store);

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, category, price, currency, image_url, is_featured"
        )
        .eq("store_id", storeData.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (productError) {
        console.error("Store products error:", productError);
        setProducts([]);
      } else {
        setProducts(productData ?? []);
      }

      setLoading(false);
    }

    loadStore();
  }, [slug]);

  function formatPrice(price: number, currency: string) {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(price);
    } catch {
      return `${currency} ${price.toLocaleString()}`;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading store...</p>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold">Store not found</h1>

          <p className="mt-4 text-gray-500">
            {errorMessage || "This store may no longer be available."}
          </p>

          <Link
            href="/shop"
            className="mt-8 inline-block rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white"
          >
            Browse marketplace
          </Link>
        </div>
      </main>
    );
  }

  const location = [store.city, store.state, store.country]
    .filter(Boolean)
    .join(", ");

  const hasBadges = store.is_verified || store.founding_number !== null;

  return (
    <main className="min-h-screen bg-white text-black">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandLogo />

          <div className="flex items-center gap-5">
            <Link
              href="/shop"
              className="text-sm font-medium text-gray-600 transition hover:text-black"
            >
              Marketplace
            </Link>

            <Link
              href="/cart"
              className="text-sm font-medium text-gray-600 transition hover:text-black"
            >
              Cart
            </Link>
          </div>
        </div>
      </header>

      {/* STORE HERO */}
      <section className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
          {/* BANNER, in a black frame so it always stands out from the page */}
          <div className="overflow-hidden rounded-3xl bg-black p-1.5">
            {store.banner_url ? (
              <img
                src={store.banner_url}
                alt={`${store.name} banner`}
                className="aspect-[4/1] max-h-56 w-full rounded-[1.125rem] object-cover"
              />
            ) : (
              <div className="aspect-[4/1] max-h-56 w-full rounded-[1.125rem] bg-gradient-to-br from-neutral-800 to-neutral-600" />
            )}
          </div>

          {/* LOGO (overlaps the banner) AND NAME */}
          <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:items-start sm:gap-6">
            <div className="-mt-10 ml-4 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-md sm:-mt-14 sm:ml-6 sm:h-28 sm:w-28">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="px-3 text-center text-sm font-bold tracking-wider">
                  {store.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 px-4 sm:px-0 sm:pt-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  {store.name}
                </h1>

                {store.is_verified && (
                  <Link
                    href="/journal/what-verified-by-spurax-means"
                    aria-label="Verified by Spurax"
                    title="Verified by Spurax. Tap to learn what this means."
                    className="shrink-0"
                  >
                    <VerifiedBadge size={30} />
                  </Link>
                )}

                {store.founding_number !== null && (
                  <Link
                    href="/founding-stores"
                    aria-label="Founding Store"
                    title="Founding Store. One of the first 50 stores on Spurax."
                    className="shrink-0"
                  >
                    <FoundingBadge size={30} />
                  </Link>
                )}
              </div>

              {store.description && (
                <p className="mt-3 max-w-2xl text-base leading-7 text-gray-500">
                  {store.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT THE BADGES (closed until someone clicks it) */}
      {hasBadges && (
        <section className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-black [&::-webkit-details-marker]:hidden">
                About this store&apos;s badges
                <span className="text-[10px] transition group-open:rotate-180">
                  ▼
                </span>
              </summary>

              <div className="mt-4 space-y-6 rounded-3xl border border-gray-200 p-6">
                {store.is_verified && (
                  <div>
                    <div className="flex items-center gap-3">
                      <VerifiedBadge size={28} className="shrink-0" />

                      <p className="font-semibold">
                        Verified by Spurax: what we checked
                      </p>
                    </div>

                    <ul className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                      <TrustItem
                        label="Identity verified"
                        detail="Government ID and selfie reviewed"
                      />

                      {store.verification_level === "business" && (
                        <>
                          <TrustItem
                            label="Registered business"
                            detail="CAC registration reviewed"
                          />
                          <TrustItem
                            label="Business address"
                            detail="Proof of address reviewed"
                          />
                        </>
                      )}

                      {store.payouts_ready && (
                        <TrustItem
                          label="Payments connected"
                          detail="Payout account set up"
                        />
                      )}

                      <TrustItem
                        label={`On Spurax since ${new Date(
                          store.created_at
                        ).getFullYear()}`}
                        detail="Member of the marketplace"
                      />
                    </ul>

                    <p className="mt-4 text-xs text-gray-400">
                      {store.verified_at
                        ? `Verified on ${new Date(
                            store.verified_at
                          ).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}. `
                        : ""}
                      <Link
                        href="/journal/what-verified-by-spurax-means"
                        className="underline"
                      >
                        What does verified mean?
                      </Link>
                    </p>
                  </div>
                )}

                {store.founding_number !== null && (
                  <div>
                    <div className="flex items-center gap-3">
                      <FoundingBadge size={28} className="shrink-0" />

                      <p className="font-semibold">Founding Store</p>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      One of the first 50 stores on Spurax Global Marketplace.
                      This badge is awarded by Spurax and cannot be applied
                      for.{" "}
                      <Link href="/founding-stores" className="underline">
                        Read about Founding Stores
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </details>
          </div>
        </section>
      )}

      {/* STORE DETAILS */}
      <section className="border-b border-gray-200 bg-[#fafafa]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {location && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Location
                </p>

                <p className="mt-2 text-sm font-medium">{location}</p>

                {store.address && (
                  <p className="mt-1 text-sm text-gray-500">{store.address}</p>
                )}
              </div>
            )}

            {(store.contact_email || store.contact_phone) && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Contact
                </p>

                {store.contact_email && (
                  <a
                    href={`mailto:${store.contact_email}`}
                    className="mt-2 block break-all text-sm font-medium hover:underline"
                  >
                    {store.contact_email}
                  </a>
                )}

                {store.contact_phone && (
                  <a
                    href={`tel:${store.contact_phone}`}
                    className="mt-1 block text-sm text-gray-500 hover:text-black"
                  >
                    {store.contact_phone}
                  </a>
                )}
              </div>
            )}

            {store.website_url && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Website
                </p>

                <a
                  href={store.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-sm font-medium underline underline-offset-4"
                >
                  Visit website →
                </a>
              </div>
            )}
          </div>

          {(store.instagram_url ||
            store.facebook_url ||
            store.tiktok_url ||
            store.x_url ||
            store.youtube_url) && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Connect with {store.name}
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {store.instagram_url && (
                  <SocialLink label="Instagram" href={store.instagram_url} />
                )}

                {store.facebook_url && (
                  <SocialLink label="Facebook" href={store.facebook_url} />
                )}

                {store.tiktok_url && (
                  <SocialLink label="TikTok" href={store.tiktok_url} />
                )}

                {store.x_url && <SocialLink label="X" href={store.x_url} />}

                {store.youtube_url && (
                  <SocialLink label="YouTube" href={store.youtube_url} />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              STORE PRODUCTS
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Shop {store.name}
            </h2>
          </div>

          <p className="text-sm text-gray-500">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-[#f3f3f3] px-6 py-20 text-center">
            <h3 className="text-2xl font-semibold">No products yet</h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              This store hasn&apos;t added any products yet.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group"
              >
                <div className="relative overflow-hidden rounded-3xl bg-[#f3f3f3]">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Product image
                      </span>
                    </div>
                  )}

                  {product.is_featured && (
                    <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      Featured
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold transition group-hover:opacity-60">
                    {product.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {product.category}
                  </p>

                  <p className="mt-3 text-sm font-semibold">
                    {formatPrice(product.price, product.currency)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SocialLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:border-black hover:bg-black hover:text-white"
    >
      <SocialIcon name={label.toLowerCase() as SocialName} size={20} />
    </a>
  );
}

function TrustItem({ label, detail }: { label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-white">
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>

      <span>
        <span className="block font-semibold">{label}</span>
        <span className="block text-gray-500">{detail}</span>
      </span>
    </li>
  );
}