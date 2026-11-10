"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { addToCart, getCartCount } from "@/lib/cart";
import BrandLogo from "@/components/BrandLogo";
import AdminButton from "@/components/AdminButton";
import { useSiteSettings } from "@/lib/site-settings";
import { CATEGORIES, categoryHref } from "@/lib/categories";
import NewsletterForm from "@/components/NewsletterForm";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  image_url: string | null;
  sizes: string[];
  colors: string[];
  is_featured: boolean;
};

const MENU_ITEMS = [
  { href: "/account", title: "Account", text: "Manage your account" },
  { href: "/seller", title: "Sell on Spurax", text: "Open or manage your store" },
  { href: "/addresses", title: "Addresses", text: "Manage your delivery addresses" },
  { href: "/orders", title: "Orders", text: "View and track your orders" },
  { href: "/settings", title: "Settings", text: "Password and security" },
  { href: "/journal", title: "Journal", text: "Guides, stories and updates" },
  { href: "/support", title: "Help & Support", text: "Get help with your order or account" },
  { href: "/about", title: "About us", text: "Learn about the marketplace" },
];

function BasketIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 9h18l-1.6 9.1A2 2 0 0 1 17.4 20H6.6a2 2 0 0 1-2-1.9L3 9z" />
      <path d="M8 9l3-5M16 9l-3-5" />
      <path d="M9 13v4M12 13v4M15 13v4" />
    </svg>
  );
}

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

export default function Home() {
  const supabase = createClient();
  const { ad_board: ad } = useSiteSettings();

  const [products, setProducts] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, category, price, currency, image_url, sizes, colors, is_featured"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error) {
        console.error(error);
        setLoaded(true);
        return;
      }

      setProducts(
        (data ?? []).map((product) => ({
          ...product,
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
          colors: Array.isArray(product.colors) ? product.colors : [],
        }))
      );

      setLoaded(true);
    }

    loadProducts();
    setCartCount(getCartCount());

    function updateCartCount() {
      setCartCount(getCartCount());
    }

    window.addEventListener("spurax-cart-updated", updateCartCount);

    return () => {
      window.removeEventListener("spurax-cart-updated", updateCartCount);
    };
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();

    for (const product of products) {
      map.set(product.category, (map.get(product.category) || 0) + 1);
    }

    return map;
  }, [products]);

  const newArrivals = products.slice(0, 8);

  const rows = useMemo(
    () =>
      CATEGORIES.filter((category) => category.name !== "Other")
        .map((category) => ({
          category,
          items: products
            .filter((product) => product.category === category.name)
            .slice(0, 4),
        }))
        .filter((row) => row.items.length > 0)
        .slice(0, 4),
    [products]
  );

  const adReady = ad.enabled && ad.image_url.trim() !== "";

  return (
    <main className="min-h-screen bg-white text-[#111111]">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <BrandLogo size={36} />

          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium transition hover:text-gray-500">
              Home
            </Link>

            <Link href="/shop" className="text-sm font-medium transition hover:text-gray-500">
              Shop
            </Link>

            <Link href="/journal" className="text-sm font-medium transition hover:text-gray-500">
              Journal
            </Link>
          </nav>

          <form action="/shop" method="GET" className="hidden items-center lg:flex">
            <div className="flex items-center rounded-full border border-black/10 bg-[#f7f7f7] px-4 py-2.5 transition focus-within:border-black/30">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 text-gray-500"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                type="search"
                name="search"
                placeholder="Search products..."
                aria-label="Search products"
                className="ml-2 w-44 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/account"
              className="hidden rounded-full border border-black px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-black hover:text-white sm:inline-flex"
            >
              Account
            </Link>

            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 sm:px-5"
            >
              <BasketIcon className="h-5 w-5" />
              Cart{cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-xl font-semibold transition hover:bg-black hover:text-white"
              >
                ⋮
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
                  {MENU_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-4 py-3 transition hover:bg-[#f5f5f5]"
                    >
                      <span className="block text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {item.text}
                      </span>
                    </Link>
                  ))}

                  <AdminButton
                    variant="menu"
                    onNavigate={() => setMenuOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <h1 className="sr-only">Spurax Global Marketplace</h1>

      {/* SEARCH (phones) */}
      <form action="/shop" method="GET" className="px-4 pt-4 lg:hidden">
        <div className="flex items-center rounded-full border border-black/10 bg-[#f7f7f7] px-4 py-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-4 w-4 text-gray-500"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>

          <input
            type="search"
            name="search"
            placeholder="Search products..."
            aria-label="Search products"
            className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
      </form>

      {/* AD BOARD (slim, set by admins) OR BRAND STRIP */}
      <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        {adReady ? (
          <AdBoard image={ad.image_url} link={ad.link} alt={ad.alt} />
        ) : (
          <div className="rounded-2xl bg-black px-6 py-7 text-white sm:px-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-400">
              Spurax / Global Marketplace
            </p>

            <p className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">
              Discover what defines you.
            </p>

            <p className="mt-2 max-w-xl text-sm text-gray-400">
              Products from independent stores, all in one place.
            </p>
          </div>
        )}
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Shop by category
          </h2>

          <Link href="/shop" className="text-sm font-semibold underline underline-offset-4">
            All products
          </Link>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((category) => {
            const count = counts.get(category.name) || 0;

            return (
              <Link
                key={category.name}
                href={categoryHref(category.name)}
                className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl bg-[#f3f3f3] px-2 py-4 text-center transition hover:bg-black hover:text-white sm:w-28"
              >
                <span className="text-2xl">{category.emoji}</span>

                <span className="text-xs font-semibold leading-tight">
                  {category.name}
                </span>

                {count > 0 && (
                  <span className="text-[10px] opacity-60">
                    {count} item{count === 1 ? "" : "s"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            New arrivals
          </h2>

          <Link href="/shop" className="text-sm font-semibold underline underline-offset-4">
            View all
          </Link>
        </div>

        {!loaded ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="aspect-square animate-pulse rounded-2xl bg-[#f3f3f3]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-5 rounded-3xl bg-[#f3f3f3] px-6 py-16 text-center">
            <p className="text-sm text-gray-500">
              No products yet. Be the first to sell on Spurax.
            </p>

            <Link
              href="/create-store"
              className="mt-5 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              Open your store
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* CATEGORY ROWS */}
      {rows.map((row) => (
        <section key={row.category.name} className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              <span className="mr-2">{row.category.emoji}</span>
              {row.category.name}
            </h2>

            <Link
              href={categoryHref(row.category.name)}
              className="text-sm font-semibold underline underline-offset-4"
            >
              See all
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {row.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
      
            {/* NEWSLETTER */}
      <section className="bg-[#f3f3f3] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            Stay connected
          </p>

          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Stay in the loop.
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
            New stores, new products and updates from Spurax. No spam, and you
            can unsubscribe at any time.
          </p>

          <NewsletterForm />
        </div>
      </section>

      {/* SELL ON SPURAX */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-black px-6 py-10 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Have something to sell?
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm text-gray-400">
            Open your store in minutes, set your own delivery fee and get paid
            straight into your bank account.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/create-store"
              className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Open your store
            </Link>

            <Link
              href="/journal/open-your-store-and-get-paid"
              className="rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdBoard({
  image,
  link,
  alt,
}: {
  image: string;
  link: string;
  alt: string;
}) {
  const picture = (
    <div className="relative overflow-hidden rounded-2xl bg-[#f3f3f3]">
      <img
        src={image}
        alt={alt || "Advertisement"}
        className="aspect-[3/1] w-full object-cover sm:aspect-[6/1]"
      />

      <span className="absolute right-3 top-3 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
        Ad
      </span>
    </div>
  );

  const target = link.trim();

  if (!target) return picture;

  if (/^https?:/i.test(target)) {
    return (
      <a href={target} target="_blank" rel="noopener noreferrer sponsored">
        {picture}
      </a>
    );
  }

  return <Link href={target}>{picture}</Link>;
}

function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const needsOptions = product.sizes.length > 0 || product.colors.length > 0;

  function handleAdd() {
    if (needsOptions) {
      window.location.href = `/shop/${product.slug}`;
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      imageUrl: product.image_url,
      size: "",
      color: "",
      quantity: 1,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="group">
      <Link href={`/shop/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#e8e8e8]">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                Product Image
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="mt-3">
        <Link
          href={`/shop/${product.slug}`}
          className="line-clamp-2 text-sm font-semibold hover:underline sm:text-base"
        >
          {product.name}
        </Link>

        <p className="mt-1 text-xs text-gray-500">{product.category}</p>

        <p className="mt-1 text-sm font-semibold">
          {formatPrice(product.price, product.currency)}
        </p>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 w-full rounded-full bg-black py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
      >
        {added ? "Added ✓" : needsOptions ? "Choose options" : "Add to cart"}
      </button>
    </article>
  );
}