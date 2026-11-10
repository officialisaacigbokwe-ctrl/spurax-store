"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  customer_name: string | null;
};

export default function OrdersPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to view your orders.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, payment_status, total, currency, created_at, customer_name"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError("We couldn't load your orders.");
        setLoading(false);
        return;
      }

      setOrders(data ?? []);
      setLoading(false);
    }

    loadOrders();
  }, [supabase]);

  function formatPrice(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currency || "NGN",
      }).format(amount);
    } catch {
      return `${currency || "NGN"} ${amount.toLocaleString()}`;
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function statusLabel(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <main className="min-h-screen bg-white px-5 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <Link
            href="/shop"
            className="text-sm font-medium text-gray-500 transition hover:text-black"
          >
            ← Continue shopping
          </Link>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            My Orders
          </h1>

          <p className="mt-2 text-gray-500">
            View your purchases and track their status.
          </p>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 p-10 text-center">
            <p className="text-sm text-gray-500">Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 p-12 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-semibold">No orders yet</h2>

              <p className="mt-3 text-gray-500">
                Your orders will appear here after you complete a purchase.
              </p>

              <Link
                href="/shop"
                className="mt-7 inline-flex rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Start Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-3xl border border-gray-200 p-6 transition hover:border-black hover:shadow-sm"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      Order
                    </p>

                    <p className="mt-1 font-semibold">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        order.payment_status === "paid"
                          ? "bg-green-100 text-green-700"
                          : order.payment_status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      Payment: {statusLabel(order.payment_status)}
                    </span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                      {statusLabel(order.status)}
                    </span>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs text-gray-400">Total</p>

                    <p className="mt-1 text-lg font-semibold">
                      {formatPrice(order.total, order.currency)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}