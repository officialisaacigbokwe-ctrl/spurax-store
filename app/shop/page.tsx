"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addToCart, getCartCount } from "@/lib/cart";
import Link from "next/link";

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

export default function ShopPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
  "newest" | "price-low" | "price-high" | "name"
>("newest");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = params.get("search") || "";
    const initialCategory = params.get("category") || "";

    setSearch(initialSearch);

    if (initialCategory) {
      setCategory(initialCategory);
    }

    let mounted = true;

    async function loadProducts() {
      try {
        const productRequest = supabase
          .from("products")
          .select(
            "id, name, slug, description, category, price, currency, image_url, is_featured"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Product request timed out."));
          }, 10000);
        });

        const { data, error } = await Promise.race([
          productRequest,
          timeout,
        ]);

        if (!mounted) return;

        if (error) {
          console.error("Product loading error:", error);
          setProducts([]);
        } else {
          setProducts(data ?? []);
        }
      } catch (error) {
        console.error("Product loading error:", error);

        if (mounted) {
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    setCartCount(getCartCount());

    function updateCartCount() {
      setCartCount(getCartCount());
    }

    window.addEventListener(
      "spurax-cart-updated",
      updateCartCount
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "spurax-cart-updated",
        updateCartCount
      );
    };
  }, []);

  const categories = [
    "All",
    ...Array.from(
      new Set(products.map((product) => product.category))
    ),
  ];

  const searchTerm = search.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      category === "All" ||
      product.category === category;

    const matchesSearch =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm) ||
      (product.description ?? "")
        .toLowerCase()
        .includes(searchTerm);

    return matchesCategory && matchesSearch;
  });
  const sortedProducts = [...filteredProducts].sort((a, b) => {
  switch (sortBy) {
    case "price-low":
      return a.price - b.price;

    case "price-high":
      return b.price - a.price;

    case "name":
      return a.name.localeCompare(b.name);

    case "newest":
    default:
      // Keep the existing newest-first database order.
      return 0;
  }
});

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

  return (
    <main className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <Link
            href="/"
            className="flex shrink-0 items-center"
          >
            <img
              src="/spurax-logo.jpg"
              alt="SPURAX"
              className="h-10 w-auto object-contain"
            />
          </Link>

          <form
            action="/shop"
            method="GET"
            className="hidden min-w-0 flex-1 md:flex md:max-w-md"
          >
            <div className="flex w-full items-center rounded-full border border-gray-200 bg-[#f7f7f7] px-4 py-2.5 transition focus-within:border-black/40">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 shrink-0 text-gray-500"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search products..."
                aria-label="Search products"
                className="ml-2 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          </form>

          <div className="flex shrink-0 items-center gap-6">
            <Link
              href="/account"
              className="hidden text-sm font-medium hover:opacity-60 sm:block"
            >
              Account
            </Link>

            <Link
              href="/cart"
              className="text-sm font-medium hover:opacity-60"
            >
              Cart{cartCount > 0 ? ` (${cartCount})` : ""}
            </Link>

            <Link
              href="/"
              className="text-sm font-medium hover:opacity-60"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* MARKETPLACE HERO */}
      <section className="border-b border-gray-200 bg-[#f3f3f3] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-gray-500">
            SPURAX MARKETPLACE
          </p>

          <h1 className="mt-4 max-w-3xl text-5xl font-bold tracking-tight md:text-7xl">
            Discover more.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-gray-500 md:text-lg">
            Explore products from independent stores and sellers
            across different categories, all in one marketplace.
          </p>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="flex gap-3 overflow-x-auto pb-3">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full px-5 py-3 text-sm font-medium transition ${
                category === item
                  ? "bg-black text-white"
                  : "border border-gray-200 bg-white hover:bg-gray-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* SEARCH RESULT */}
      {searchTerm && (
        <section className="mx-auto max-w-7xl px-6 pt-8">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Search results for{" "}
              <span className="font-semibold text-black">
                "{search}"
              </span>
            </p>

            <Link
              href="/shop"
              className="text-sm font-medium underline underline-offset-4"
            >
              Clear search
            </Link>
          </div>
        </section>
      )}

      {/* PRODUCTS */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {loading ? (
          <div className="py-20 text-center">
            <p className="text-sm text-gray-500">
              Loading products...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl bg-[#f3f3f3] px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold">
              {searchTerm
                ? "No products found"
                : "No products available"}
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              {searchTerm
                ? `We couldn't find anything matching "${search}". Try another search.`
                : "There are currently no products in this category."}
            </p>

            {searchTerm && (
              <Link
                href="/shop"
                className="mt-7 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
              >
                View all products
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="col-span-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <p className="text-sm text-gray-500">
    Showing {sortedProducts.length} products
  </p>

  <label className="flex items-center gap-3 text-sm">
    <span className="text-gray-500">Sort by</span>

    <select
      value={sortBy}
      onChange={(event) =>
        setSortBy(
          event.target.value as
            | "newest"
            | "price-low"
            | "price-high"
            | "name"
        )
      }
      className="rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-black"
    >
      <option value="newest">Newest first</option>
      <option value="price-low">Price: Low to High</option>
      <option value="price-high">Price: High to Low</option>
      <option value="name">Name: A–Z</option>
    </select>
  </label>
</div>
            {sortedProducts.map((product) =>  (
              <div
                key={product.id}
                className="group"
              >
                <Link
                  href={`/shop/${product.slug}`}
                  className="block"
                >
                  <div className="relative mx-auto w-full max-w-[200px] overflow-hidden rounded-2xl bg-[#f3f3f3]">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="aspect-square w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center text-sm text-gray-400">
                        Product image
                      </div>
                    )}

                    {product.is_featured && (
                      <span className="absolute left-3 top-3 rounded-full bg-black px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Featured
                      </span>
                    )}
                  </div>
                </Link>

                <div className="pt-4">
                  <Link href={`/shop/${product.slug}`}>
                    <h2 className="font-semibold transition group-hover:opacity-60">
                      {product.name}
                    </h2>
                  </Link>

                  <p className="mt-1 text-sm text-gray-500">
                    {product.category}
                  </p>

                  <p className="mt-3 text-sm font-semibold">
                    {formatPrice(
                      product.price,
                      product.currency
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      addToCart({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        currency: product.currency,
                        imageUrl: product.image_url,
                        quantity: 1,
                        slug: product.slug,
                        size: "",
                        color: "",
                      });

                      setCartCount(getCartCount());
                    }}
                    className="mt-4 w-full rounded-full border border-black bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                  >
                    Add to Cart
                  </button>

                  <Link
                    href={`/shop/${product.slug}`}
                    className="mt-3 block w-full rounded-full border border-gray-300 px-5 py-3 text-center text-sm font-semibold transition hover:border-black hover:bg-black hover:text-white"
                  >
                    View Product
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SELL ON SPURAX */}
      <section className="border-t border-gray-200 bg-[#f3f3f3] px-6 py-24">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
            FOR SELLERS
          </p>

          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Have something to sell?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-500">
            Create your own SPURAX store and bring your products
            to customers through the marketplace.
          </p>

          <Link
            href="/create-store"
            className="mt-8 inline-block rounded-full bg-black px-8 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Start your store
          </Link>
        </div>
      </section>

      
    </main>
  );
}