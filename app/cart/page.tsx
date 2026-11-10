"use client";
import BrandLogo from "@/components/BrandLogo";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import {
  CartItem,
  getCart,
  removeFromCart,
  updateCartQuantity,
} from "@/lib/cart";

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(getCart());
  }, []);

  function removeItem(item: CartItem) {
    removeFromCart(item.productId, item.size, item.color);
    setCart(getCart());
  }

  function changeQuantity(item: CartItem, quantity: number) {
    updateCartQuantity(
      item.productId,
      item.size,
      item.color,
      quantity
    );

    setCart(getCart());
  }

  
  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const currency = cart[0]?.currency || "NGN";

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo />

          <Link
            href="/shop"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            Continue shopping
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <h1 className="text-4xl font-bold tracking-tight">
          Your Cart
        </h1>

        {cart.length === 0 ? (
          <div className="mt-12 rounded-3xl bg-[#f3f3f3] px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold">
              Your cart is empty
            </h2>

            <p className="mt-3 text-sm text-gray-500">
              Discover something you love and add it to your cart.
            </p>

            <Link
              href="/shop"
              className="mt-7 inline-block rounded-full bg-black px-7 py-4 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Shop now
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
            <div className="space-y-5">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.size}-${item.color}`}
                  className="flex gap-5 rounded-3xl border border-gray-100 p-5"
                >
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#f3f3f3]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold tracking-[0.15em] text-gray-400">
                        SPURAX
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link
                          href={`/shop/${item.slug}`}
                          className="font-semibold hover:underline"
                        >
                          {item.name}
                        </Link>

                        {item.size && (
                          <p className="mt-1 text-sm text-gray-500">
                            Size: {item.size}
                          </p>
                        )}

                        {item.color && (
                          <p className="text-sm text-gray-500">
                            Color: {item.color}
                          </p>
                        )}
                      </div>

                      <p className="font-semibold">
                        {formatCurrency(
  item.price * item.quantity,
  item.currency
)}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-gray-200">
                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(
                              item,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          className="px-4 py-2"
                        >
                          −
                        </button>

                        <span className="min-w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            changeQuantity(
                              item,
                              item.quantity + 1
                            )
                          }
                          className="px-4 py-2"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="text-sm text-gray-400 underline underline-offset-4 hover:text-black"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-3xl bg-[#f3f3f3] p-7">
              <h2 className="text-xl font-bold">
                Order summary
              </h2>

              <div className="mt-7 flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>

                <span className="font-semibold">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              <div className="mt-4 flex justify-between border-b border-gray-200 pb-5 text-sm">
                <span className="text-gray-500">Shipping</span>

                <span className="font-medium">
                  Calculated at checkout
                </span>
              </div>

              <div className="mt-5 flex justify-between">
                <span className="font-semibold">Total</span>

                <span className="text-xl font-bold">
                  {formatCurrency(subtotal, currency)}
                </span>
              </div>

              <Link
  href="/checkout"
  className="mt-7 block w-full rounded-full bg-black py-4 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
>
  Proceed to checkout
</Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}