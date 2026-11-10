"use client";
import BrandLogo from "@/components/BrandLogo";
import FoundingBadge from "@/components/FoundingBadge";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addToCart } from "@/lib/cart";
import VerifiedBadge from "@/components/VerifiedBadge";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  image_url: string | null;
  images: string[];
  sizes: string[];
  colors: string[];
  is_featured: boolean;
  store?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    is_active: boolean;
        is_verified: boolean;
    founding_number: number | null;
  } | null;
};

export default function ProductPage() {
  const params = useParams();
  const slug = params.slug as string;

  const supabase = createClient();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("products")
        .select(
          `id, name, slug, description, category, price, currency, image_url, images, sizes, colors, is_featured,
          store:stores (id, name, slug, description, city, state, country, is_active, is_verified, founding_number)`
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .single();

      if (error) {
        setErrorMessage("Product not found.");
        setLoading(false);
        return;
      }

      const store = Array.isArray((data as any)?.store)
        ? ((data as any).store[0] ?? null)
        : ((data as any)?.store ?? null);

      setProduct({
        ...data,
        images: Array.isArray(data.images) ? data.images : [],
        sizes: Array.isArray(data.sizes) ? data.sizes : [],
        colors: Array.isArray(data.colors) ? data.colors : [],
        store,
      });

      setLoading(false);
    }

    loadProduct();
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

  function prepareCartItem() {
    if (!product) return false;

    if (product.sizes.length > 0 && !selectedSize) {
      alert("Please select a size.");
      return false;
    }

    if (product.colors.length > 0 && !selectedColor) {
      alert("Please select a color.");
      return false;
    }

    const mainImage =
      product.image_url ||
      (product.images.length > 0 ? product.images[0] : null);

    addToCart({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      imageUrl: mainImage,
      size: selectedSize,
      color: selectedColor,
      quantity,
    });

    return true;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-gray-500">Loading product...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-white px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            SPURAX MARKETPLACE
          </p>

          <h1 className="text-3xl font-bold">Product not found</h1>

          <p className="mt-3 max-w-lg text-gray-500">
            {errorMessage ||
              "This product may have been removed, deactivated, or is no longer available."}
          </p>

          <Link
            href="/shop"
            className="mt-6 inline-block rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Browse marketplace
          </Link>
        </div>
      </main>
    );
  }

  const mainImage =
    product.image_url ||
    (product.images.length > 0 ? product.images[0] : null);

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo />

          <Link
            href="/shop"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            Back to marketplace
          </Link>
        </div>
      </header>

      {/* Product */}
      <section className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Image */}
          <div className="overflow-hidden rounded-3xl bg-[#f3f3f3]">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="aspect-square h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center">
                <span className="text-sm font-medium tracking-[0.2em] text-gray-400">
                  SPURAX
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              {product.category}
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              {product.name}
            </h1>

            <p className="mt-5 text-2xl font-semibold">
              {formatPrice(product.price, product.currency)}
            </p>

            {product.description && (
              <p className="mt-6 max-w-xl text-base leading-7 text-gray-600">
                {product.description}
              </p>
            )}

            {/* Sizes */}
            {product.sizes.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold">Size</p>

                  {selectedSize && (
                    <button
                      type="button"
                      onClick={() => setSelectedSize("")}
                      className="text-xs text-gray-400 underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-full border px-5 py-2.5 text-sm font-medium transition ${
                        selectedSize === size
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-black"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {product.colors.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-sm font-semibold">Color</p>

                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`rounded-full border px-5 py-2.5 text-sm font-medium transition ${
                        selectedColor === color
                          ? "border-black bg-black text-white"
                          : "border-gray-200 hover:border-black"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold">Quantity</p>

              <div className="flex w-fit items-center rounded-full border border-gray-200">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                  className="px-5 py-3 text-lg"
                >
                  −
                </button>

                <span className="min-w-10 text-center text-sm font-semibold">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setQuantity((current) => current + 1)
                  }
                  className="px-5 py-3 text-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (!prepareCartItem()) return;

                  window.location.href = "/cart";
                }}
                className="flex-1 rounded-full bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Add to cart
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!prepareCartItem()) return;

                  window.location.href = "/checkout";
                }}
                className="flex-1 rounded-full border border-black px-7 py-4 text-sm font-semibold transition hover:bg-black hover:text-white"
              >
                Buy now
              </button>
            </div>

            {/* Product information */}
            <div className="mt-10 border-t border-gray-100 pt-6">
                            {product.store?.is_active && (
                <div className="border-b border-gray-100 py-4">
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Sold by
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/store/${product.store.slug}`}
                      className="inline-block font-semibold hover:underline"
                    >
                      {product.store.name}
                    </Link>

                    {product.store.is_verified && (
                      <Link
                        href="/journal/what-verified-by-spurax-means"
                        aria-label="Verified by Spurax"
                        title="Verified by Spurax"
                        className="shrink-0"
                      >
                        <VerifiedBadge size={22} />
                      </Link>
                    )}

                    {product.store.founding_number && (
                      <Link
                        href="/founding-stores"
                        aria-label="Founding Store"
                        title="Founding Store"
                        className="shrink-0"
                      >
                        <FoundingBadge size={22} />
                      </Link>
                    )}
                  </div>

                  {(product.store.city ||
                    product.store.state ||
                    product.store.country) && (
                    <p className="mt-1 text-sm text-gray-500">
                      {[
                        product.store.city,
                        product.store.state,
                        product.store.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">
                  Category
                </span>

                <span className="text-sm font-medium">
                  {product.category}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 py-3">
                <span className="text-sm text-gray-500">
                  Availability
                </span>

                <span className="text-sm font-medium">
                  Available
                </span>
              </div>

              {product.is_featured && (
                <div className="flex items-center justify-between border-t border-gray-100 py-3">
                  <span className="text-sm text-gray-500">
                    Marketplace
                  </span>

                  <span className="text-sm font-medium">
                    Featured product
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      
    </main>
  );
}