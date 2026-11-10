"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";
import { formatCurrency } from "@/lib/currency";

type Order = {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  currency: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
};

type Filter =
  | "toship"
  | "shipped"
  | "delivered"
  | "paid"
  | "cancelled"
  | "unpaid";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "toship", label: "To ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "paid", label: "All paid" },
  { key: "cancelled", label: "Cancelled" },
  { key: "unpaid", label: "Unpaid" },
];

function matches(order: Order, filter: Filter) {
  const paid = order.payment_status === "paid";

  switch (filter) {
    case "toship":
      return paid && (order.status === "pending" || order.status === "processing");
    case "shipped":
      return paid && order.status === "shipped";
    case "delivered":
      return paid && order.status === "delivered";
    case "paid":
      return paid;
    case "cancelled":
      return order.status === "cancelled";
    case "unpaid":
      return !paid && order.status !== "cancelled";
  }
}

export default function SellerOrdersPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter | null>(null);

  useEffect(() => {
    async function loadSellerOrders() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to access your seller orders.");
        setLoading(false);
        return;
      }

      let activeStoreId = getActiveStoreId();

      if (activeStoreId) {
        const { data: activeMembership } = await supabase
          .from("store_memberships")
          .select("store_id")
          .eq("user_id", user.id)
          .eq("store_id", activeStoreId)
          .maybeSingle();

        if (!activeMembership) {
          activeStoreId = null;
        }
      }

      if (!activeStoreId) {
        const { data: firstMembership } = await supabase
          .from("store_memberships")
          .select("store_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!firstMembership?.store_id) {
          setLoading(false);
          return;
        }

        activeStoreId = firstMembership.store_id;
      }

      if (!activeStoreId) {
        setLoading(false);
        return;
      }

      setActiveStoreId(activeStoreId);

      const { data: store } = await supabase
        .from("stores")
        .select("id, name")
        .eq("id", activeStoreId)
        .maybeSingle();

      if (!store) {
        setError("We couldn't load your store.");
        setLoading(false);
        return;
      }

      setStoreName(store.name);

      const { data, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, status, payment_status, total, currency, created_at, customer_name, customer_phone"
        )
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (ordersError) {
        console.error(ordersError);
        setError("We couldn't load your store orders.");
        setLoading(false);
        return;
      }

      setOrders(data ?? []);
      setLoading(false);
    }

    loadSellerOrders();
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function statusLabel(status: string) {
    if (!status) return "Unknown";

    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  function paymentClass(status: string) {
    if (status === "paid") return "bg-green-100 text-green-700";
    if (status === "failed") return "bg-red-100 text-red-700";

    return "bg-yellow-100 text-yellow-700";
  }

  const toShipCount = orders.filter((order) => matches(order, "toship")).length;
  const activeFilter: Filter = filter ?? (toShipCount > 0 ? "toship" : "paid");
  const visibleOrders = orders.filter((order) => matches(order, activeFilter));

  return (
    <main>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {storeName || "Seller"}
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">Orders</h1>

        <p className="mt-2 text-gray-500">
          View and manage orders placed for your store.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-gray-500">Loading your store orders...</p>
        </div>
      ) : error ? (
        <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const count = orders.filter((order) =>
                matches(order, item.key)
              ).length;
              const isActive = activeFilter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white hover:border-black"
                  }`}
                >
                  {item.label}{" "}
                  <span className={isActive ? "text-white/60" : "text-gray-400"}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {activeFilter === "unpaid" && (
            <p className="mt-4 text-xs leading-5 text-gray-500">
              These are checkouts where the customer did not pay (yet). You
              do not need to ship them.
            </p>
          )}

          {visibleOrders.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-white p-12 text-center shadow-sm">
              <h2 className="text-2xl font-semibold">
                {orders.length === 0 ? "No orders yet" : "Nothing here"}
              </h2>

              <p className="mx-auto mt-3 max-w-md text-gray-500">
                {orders.length === 0
                  ? "Orders for your store will appear here after customers purchase your products."
                  : "No orders match this tab right now."}
              </p>

              {orders.length === 0 && (
                <Link
                  href="/seller/products"
                  className="mt-7 inline-flex rounded-full bg-black px-7 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  View Products
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {visibleOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/seller/orders/${order.id}`}
                  className="block rounded-3xl border border-gray-200 bg-white p-6 transition hover:border-black hover:shadow-sm"
                >
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
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

                      <div className="mt-4 space-y-1 text-sm text-gray-500">
                        {order.customer_name && (
                          <p>
                            <span className="font-medium text-gray-700">
                              Customer:
                            </span>{" "}
                            {order.customer_name}
                          </p>
                        )}

                        {order.customer_phone && (
                          <p>
                            <span className="font-medium text-gray-700">
                              Phone:
                            </span>{" "}
                            {order.customer_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentClass(
                          order.payment_status
                        )}`}
                      >
                        Payment: {statusLabel(order.payment_status)}
                      </span>

                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {statusLabel(order.status)}
                      </span>
                    </div>

                    <div className="lg:text-right">
                      <p className="text-xs text-gray-400">Order total</p>

                      <p className="mt-1 text-lg font-semibold">
                        {formatCurrency(Number(order.total), order.currency)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}