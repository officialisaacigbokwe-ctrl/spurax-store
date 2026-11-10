"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Order = {
  id: string;
  status: string;
  payment_status: string;
  carrier: string | null;
  tracking_number: string | null;
  shipped_from: string | null;
  estimated_delivery: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
};

type TrackingEvent = {
  id: string;
  event_type: string;
  location: string | null;
  note: string | null;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  shipped: "Shipped",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const STAGES = [
  "Order placed",
  "Shipped",
  "In transit",
  "Out for delivery",
  "Delivered",
];

function stageIndex(order: Order, events: TrackingEvent[]) {
  if (order.status === "delivered") return 4;

  const types = events.map((event) => event.event_type);

  if (types.includes("out_for_delivery")) return 3;
  if (types.includes("in_transit")) return 2;
  if (order.status === "shipped" || types.includes("shipped")) return 1;

  return 0;
}

export default function TrackOrderPage() {
  const params = useParams();
  const orderId = params.id as string;

  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to track this order.");
        setLoading(false);
        return;
      }

      const { data: orderData } = await supabase
        .from("orders")
        .select(
          "id, status, payment_status, carrier, tracking_number, shipped_from, estimated_delivery, shipping_city, shipping_state"
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!orderData) {
        setError("We couldn't find this order.");
        setLoading(false);
        return;
      }

      const { data: eventData } = await supabase
        .from("order_tracking_events")
        .select("id, event_type, location, note, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      setOrder(orderData);
      setEvents(eventData ?? []);
      setLoading(false);
    }

    if (orderId) {
      load();
    }
  }, [orderId]);

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white px-5 py-12">
        <div className="mx-auto max-w-3xl rounded-3xl border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-500">Loading tracking...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-white px-5 py-12">
        <div className="mx-auto max-w-3xl">
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

  const current = stageIndex(order, events);
  const notShipped = order.status !== "shipped" && order.status !== "delivered";
  const destination = [order.shipping_city, order.shipping_state]
    .filter(Boolean)
    .join(", ");
  const newestFirst = [...events].reverse();

  return (
    <main className="min-h-screen bg-white px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/orders/${order.id}`}
          className="text-sm font-medium text-gray-500 transition hover:text-black"
        >
          ← Back to order
        </Link>

        <p className="mt-6 text-sm text-gray-400">Track your order</p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          #{order.id.slice(0, 8).toUpperCase()}
        </h1>

        {notShipped ? (
          <div className="mt-8 rounded-3xl border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold">
              Your order has not shipped yet
            </h2>

            <p className="mt-3 text-sm text-gray-500">
              The seller is preparing your order. Tracking will appear here as
              soon as it is shipped.
            </p>
          </div>
        ) : (
          <>
            {/* FROM -> TO */}
            <div className="mt-8 rounded-3xl bg-gray-50 p-6">
              <div className="flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    From
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {order.shipped_from || "Seller"}
                  </p>
                </div>

                <div className="h-px flex-1 bg-gray-300" />

                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    To
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {destination || "Your address"}
                  </p>
                </div>
              </div>

              {/* PROGRESS */}
              <div className="mt-8">
                <div className="flex items-center">
                  {STAGES.map((label, index) => (
                    <div
                      key={label}
                      className={`flex items-center ${
                        index < STAGES.length - 1 ? "flex-1" : ""
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 shrink-0 rounded-full ${
                          index <= current ? "bg-black" : "bg-gray-300"
                        }`}
                      />

                      {index < STAGES.length - 1 && (
                        <span
                          className={`h-0.5 flex-1 ${
                            index < current ? "bg-black" : "bg-gray-300"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-3 hidden justify-between text-[11px] text-gray-500 sm:flex">
                  {STAGES.map((label, index) => (
                    <span
                      key={label}
                      className={index === current ? "font-semibold text-black" : ""}
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm font-semibold sm:hidden">
                  {STAGES[current]}
                </p>
              </div>
            </div>

            {/* DETAILS */}
            <div className="mt-6 grid gap-4 rounded-3xl border border-gray-200 p-6 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Courier
                </p>
                <p className="mt-1 font-medium">{order.carrier || "-"}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Tracking
                </p>
                <p className="mt-1 break-all font-medium">
                  {order.tracking_number || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Estimated delivery
                </p>
                <p className="mt-1 font-medium">
                  {order.estimated_delivery
                    ? new Date(order.estimated_delivery).toLocaleDateString(
                        "en-NG",
                        { year: "numeric", month: "long", day: "numeric" }
                      )
                    : "-"}
                </p>
              </div>
            </div>

            {/* HISTORY */}
            <div className="mt-6 rounded-3xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold">Updates</h2>

              <ol className="mt-5 space-y-5">
                {newestFirst.map((item) => (
                  <li key={item.id} className="flex gap-4">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-black" />

                    <div>
                      <p className="text-sm font-semibold">
                        {EVENT_LABELS[item.event_type] || item.event_type}
                        {item.location ? ` · ${item.location}` : ""}
                      </p>

                      {item.note && (
                        <p className="mt-1 text-sm text-gray-500">
                          {item.note}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-400">
                        {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-6 text-xs leading-5 text-gray-400">
                Updates are entered by the seller. Delivery is handled by the
                seller, not Spurax.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}