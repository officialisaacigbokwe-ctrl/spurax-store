"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearCart } from "@/lib/cart";

type Order = {
  id: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_country: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_name: string;
  product_image_url: string | null;
  quantity: number;
  unit_price: number;
  size: string | null;
  color: string | null;
};

export default function OrderDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const paymentParam = searchParams.get("payment");

  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view this order.");
        setLoading(false);
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          payment_status,
          subtotal,
          shipping_fee,
          total,
          currency,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          shipping_city,
          shipping_state,
          shipping_country,
          created_at
        `
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (orderError || !orderData) {
        console.error(orderError);
        setError("We couldn't find this order.");
        setLoading(false);
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("order_items")
        .select(
          `
          id,
          product_name,
          product_image_url,
          quantity,
          unit_price,
          size,
          color
        `
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itemError) {
        console.error(itemError);
        setError("We couldn't load the products in this order.");
        setLoading(false);
        return;
      }

      setOrder(orderData);
      setItems(itemData ?? []);
      setLoading(false);
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId, supabase]);

  // Once the database confirms the order is paid, empty the cart.
  useEffect(() => {
    if (order?.payment_status === "paid" && paymentParam === "success") {
      clearCart();
    }
  }, [order, paymentParam]);

  function formatPrice(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency || "NGN",
      }).format(Number(amount));
    } catch {
      return `${currency || "NGN"} ${Number(amount).toLocaleString()}`;
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">
              Loading your order...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/orders"
            className="text-sm font-medium text-gray-500 hover:text-black"
          >
            ← Back to orders
          </Link>

          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
            <p className="text-sm text-red-600">
              {error || "Order not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Decide which payment notice to show (the database is the source of truth).
  let banner: { title: string; text: string; className: string } | null = null;

  if (paymentParam === "success" && order.payment_status === "paid") {
    banner = {
      title: "Payment successful",
      text: "Thank you! Your payment was received and the seller has been notified of your order.",
      className: "border-green-200 bg-green-50 text-green-800",
    };
  } else if (paymentParam === "success" || paymentParam === "pending") {
    banner = {
      title: "We're confirming your payment",
      text: "Your payment is being confirmed. Refresh this page in a moment. If the status stays unpaid, contact support before paying again.",
      className: "border-yellow-200 bg-yellow-50 text-yellow-800",
    };
  } else if (paymentParam === "failed" && order.payment_status !== "paid") {
    banner = {
      title: "Payment was not completed",
      text: "No money was taken for this order. You can go back to your cart and try again.",
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }

  const canTrack = order.status === "shipped" || order.status === "delivered";

  return (
    <main className="min-h-screen bg-white px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/orders"
          className="text-sm font-medium text-gray-500 transition hover:text-black"
        >
          ← Back to orders
        </Link>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-gray-400">Order</p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Placed on {formatDate(order.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                order.payment_status === "paid"
                  ? "bg-green-100 text-green-700"
                  : order.payment_status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
              }`}
            >
              Payment: {formatStatus(order.payment_status)}
            </span>

            <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700">
              {formatStatus(order.status)}
            </span>
          </div>
        </div>

        {banner && (
          <div
            role="status"
            className={`mt-8 rounded-2xl border px-5 py-4 text-sm ${banner.className}`}
          >
            <p className="font-semibold">{banner.title}</p>
            <p className="mt-1 leading-6">{banner.text}</p>
          </div>
        )}

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
          {/* Products */}
          <section>
            <div className="rounded-3xl border border-gray-200">
              <div className="border-b border-gray-200 p-6">
                <h2 className="text-lg font-semibold">
                  Items in your order
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-5"
                  >
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                      {item.product_image_url ? (
                        <img
                          src={item.product_image_url}
                          alt={item.product_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">
                        {item.product_name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Qty: {item.quantity}
                      </p>

                      {item.size && (
                        <p className="mt-1 text-sm text-gray-500">
                          Size: {item.size}
                        </p>
                      )}

                      {item.color && (
                        <p className="mt-1 text-sm text-gray-500">
                          Colour: {item.color}
                        </p>
                      )}

                      <p className="mt-3 font-semibold">
                        {formatPrice(
                          Number(item.unit_price) * item.quantity,
                          order.currency
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery information */}
            <div className="mt-8 rounded-3xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold">
                Delivery information
              </h2>

              <div className="mt-5 space-y-2 text-sm text-gray-600">
                {order.customer_name && (
                  <p>{order.customer_name}</p>
                )}

                {order.customer_phone && (
                  <p>{order.customer_phone}</p>
                )}

                {order.shipping_address && (
                  <p>{order.shipping_address}</p>
                )}

                {(order.shipping_city || order.shipping_state) && (
                  <p>
                    {[order.shipping_city, order.shipping_state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}

                {order.shipping_country && (
                  <p>{order.shipping_country}</p>
                )}
              </div>
            </div>
          </section>

          {/* Summary */}
          <aside>
            <div className="rounded-3xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    {formatPrice(
                      Number(order.subtotal),
                      order.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">
                    Delivery
                  </span>

                  <span className="font-medium">
                    {Number(order.shipping_fee) === 0
                      ? "Free"
                      : formatPrice(
                          Number(order.shipping_fee),
                          order.currency
                        )}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold">
                      Total
                    </span>

                    <span className="text-lg font-semibold">
                      {formatPrice(
                        Number(order.total),
                        order.currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {canTrack && (
              <Link
                href={`/orders/${order.id}/track`}
                className="mt-4 block rounded-full bg-black px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Track your order
              </Link>
            )}

            <Link
              href="/shop"
              className={`mt-4 block rounded-full px-6 py-3 text-center text-sm font-semibold transition ${
                canTrack
                  ? "border border-gray-200 hover:border-black"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}