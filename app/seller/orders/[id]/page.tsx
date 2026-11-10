"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/currency";

type Order = {
  id: string;
  user_id: string | null;
  store_id: string | null;
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
  carrier: string | null;
  tracking_number: string | null;
  shipped_from: string | null;
  estimated_delivery: string | null;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  quantity: number;
  unit_price: number;
  size: string | null;
  color: string | null;
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

const inputClass =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black";

export default function SellerOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const supabase = createClient();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [storeName, setStoreName] = useState("");

  const [status, setStatus] = useState("pending");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Ship form
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippedFrom, setShippedFrom] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [shipNote, setShipNote] = useState("");

  // Update form
  const [eventType, setEventType] = useState("in_transit");
  const [updateLocation, setUpdateLocation] = useState("");
  const [updateNote, setUpdateNote] = useState("");

  async function loadOrder(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please sign in to view this order.");
      }

      const { data: orderData } = await supabase
        .from("orders")
        .select(
          `
          id,
          user_id,
          store_id,
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
          created_at,
          carrier,
          tracking_number,
          shipped_from,
          estimated_delivery
        `
        )
        .eq("id", orderId)
        .maybeSingle();

      if (!orderData || !orderData.store_id) {
        throw new Error("Order not found or you do not have access to it.");
      }

      // The signed-in user must belong to the store this order was placed in.
      const { data: membership } = await supabase
        .from("store_memberships")
        .select("store_id")
        .eq("user_id", user.id)
        .eq("store_id", orderData.store_id)
        .maybeSingle();

      if (!membership) {
        throw new Error("You do not have access to this order.");
      }

      const { data: store } = await supabase
        .from("stores")
        .select("name, city, state, delivery_origin_state")
        .eq("id", orderData.store_id)
        .maybeSingle();

      setStoreName(store?.name || "");

      // Suggest where it ships from, the first time only
      setShippedFrom(
        (current) =>
          current ||
          store?.city ||
          store?.delivery_origin_state ||
          store?.state ||
          ""
      );

      setOrder(orderData);
      setStatus(orderData.status || "pending");

      const { data: itemData, error: itemsError } = await supabase
        .from("order_items")
        .select(
          "id, product_id, product_name, product_image_url, quantity, unit_price, size, color"
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itemsError) {
        throw new Error("We couldn't load the order items.");
      }

      setItems(itemData || []);

      const { data: eventData } = await supabase
        .from("order_tracking_events")
        .select("id, event_type, location, note, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      setEvents(eventData || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the order."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const isPaid = order?.payment_status === "paid";
  const canEditStatus =
    isPaid && (order?.status === "pending" || order?.status === "processing");
  const canShip = canEditStatus;
  const isShipped = order?.status === "shipped";

  async function sendTracking(payload: Record<string, unknown>) {
    if (!order) return false;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/seller/orders/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, ...payload }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Could not save the update.");
      }

      await loadOrder(false);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the update."
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleShip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await sendTracking({
      action: "ship",
      carrier,
      trackingNumber,
      shippedFrom,
      estimatedDelivery,
      note: shipNote,
    });

    if (ok) {
      setCarrier("");
      setTrackingNumber("");
      setEstimatedDelivery("");
      setShipNote("");
      setNotice("Order marked as shipped. The customer can now track it.");
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await sendTracking({
      action: "update",
      eventType,
      location: updateLocation,
      note: updateNote,
    });

    if (ok) {
      setUpdateLocation("");
      setUpdateNote("");
      setNotice("Tracking update added.");
    }
  }

  async function handleDeliver() {
    const confirmed = window.confirm(
      "Mark this order as delivered? The customer will see it as completed."
    );

    if (!confirmed) return;

    const ok = await sendTracking({
      action: "deliver",
      location: order?.shipping_city || "",
    });

    if (ok) {
      setNotice("Order marked as delivered.");
    }
  }

  async function updateStatus() {
    if (!order || !order.store_id) return;

    if (status === "cancelled" && isPaid) {
      const confirmed = window.confirm(
        "This order has been paid. Cancelling it means the customer must be refunded. Contact Spurax support to arrange the refund. Continue?"
      );

      if (!confirmed) return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", order.id)
        .eq("store_id", order.store_id)
        .select("id");

      if (updateError || !data || data.length === 0) {
        console.error(updateError);
        throw new Error("We couldn't update the order status.");
      }

      setOrder({ ...order, status });
      setNotice("Order status updated.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while updating the order."
      );
    } finally {
      setBusy(false);
    }
  }

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
      <main>
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm text-gray-500">Loading order...</p>
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main>
        <Link
          href="/seller/orders"
          className="text-sm font-medium text-gray-500 hover:text-black"
        >
          ← Back to orders
        </Link>

        <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </main>
    );
  }

  if (!order) return null;

  return (
    <main>
      <Link
        href="/seller/orders"
        className="text-sm font-medium text-gray-500 hover:text-black"
      >
        ← Back to orders
      </Link>

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{storeName}</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              isPaid
                ? "bg-green-100 text-green-700"
                : order.payment_status === "failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            Payment:{" "}
            {order.payment_status.charAt(0).toUpperCase() +
              order.payment_status.slice(1)}
          </span>

          <span className="rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold capitalize text-gray-700">
            {order.status}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {notice && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">{notice}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* PRODUCTS */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Products</h2>

              <span className="text-sm text-gray-500">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="mt-6 space-y-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border-b border-gray-100 pb-5 last:border-0 last:pb-0"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                    {item.product_image_url ? (
                      <img
                        src={item.product_image_url}
                        alt={item.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        SPURAX
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{item.product_name}</h3>

                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <p>Quantity: {item.quantity}</p>
                      {item.size && <p>Size: {item.size}</p>}
                      {item.color && <p>Color: {item.color}</p>}
                    </div>
                  </div>

                  <p className="text-sm font-medium">
                    {formatCurrency(
                      Number(item.unit_price) * item.quantity,
                      order.currency
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CUSTOMER */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Customer &amp; delivery</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Customer
                </p>
                <p className="mt-1 font-medium">
                  {order.customer_name || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Email
                </p>
                <p className="mt-1 break-all text-sm">
                  {order.customer_email || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Phone
                </p>
                <p className="mt-1 text-sm">
                  {order.customer_phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Country
                </p>
                <p className="mt-1 text-sm">
                  {order.shipping_country || "Not provided"}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Delivery address
                </p>

                <p className="mt-1 text-sm leading-6">
                  {order.shipping_address || "Not provided"}
                  {order.shipping_city ? `, ${order.shipping_city}` : ""}
                  {order.shipping_state ? `, ${order.shipping_state}` : ""}
                </p>
              </div>
            </div>
          </section>

          {/* TRACKING HISTORY */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Tracking history</h2>

            {events.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No shipping updates yet.
              </p>
            ) : (
              <ol className="mt-5 space-y-5">
                {events.map((item) => (
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
            )}
          </section>
        </div>

        <aside className="space-y-6">
          {/* SHIPPING */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Shipping</h2>

            {!isPaid && (
              <p className="mt-3 text-xs leading-5 text-gray-500">
                You can ship this order once the customer has paid. Do not ship
                an order that is not paid.
              </p>
            )}

            {canShip && (
              <form onSubmit={handleShip} className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Courier or rider
                  </label>
                  <input
                    value={carrier}
                    onChange={(event) => setCarrier(event.target.value)}
                    placeholder="e.g. GIG Logistics or Mr Bayo"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Tracking number or rider phone
                  </label>
                  <input
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Shipping from</label>
                  <input
                    value={shippedFrom}
                    onChange={(event) => setShippedFrom(event.target.value)}
                    placeholder="e.g. Lagos"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Estimated delivery date
                  </label>
                  <input
                    type="date"
                    value={estimatedDelivery}
                    onChange={(event) =>
                      setEstimatedDelivery(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Note (optional)</label>
                  <input
                    value={shipNote}
                    onChange={(event) => setShipNote(event.target.value)}
                    placeholder="Anything the customer should know"
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Mark as shipped"}
                </button>
              </form>
            )}

            {isShipped && (
              <div className="mt-4 space-y-5">
                <div className="space-y-1 rounded-2xl bg-gray-50 p-4 text-sm">
                  <p>
                    <span className="text-gray-500">Courier:</span>{" "}
                    {order.carrier || "-"}
                  </p>
                  <p>
                    <span className="text-gray-500">Tracking:</span>{" "}
                    {order.tracking_number || "-"}
                  </p>
                  <p>
                    <span className="text-gray-500">From:</span>{" "}
                    {order.shipped_from || "-"}
                  </p>
                  <p>
                    <span className="text-gray-500">Estimated delivery:</span>{" "}
                    {order.estimated_delivery
                      ? new Date(order.estimated_delivery).toLocaleDateString(
                          "en-NG",
                          { year: "numeric", month: "short", day: "numeric" }
                        )
                      : "-"}
                  </p>
                </div>

                <form onSubmit={handleUpdate} className="space-y-4">
                  <p className="text-sm font-semibold">Add an update</p>

                  <select
                    value={eventType}
                    onChange={(event) => setEventType(event.target.value)}
                    className={inputClass}
                  >
                    <option value="in_transit">In transit</option>
                    <option value="out_for_delivery">Out for delivery</option>
                  </select>

                  <input
                    value={updateLocation}
                    onChange={(event) => setUpdateLocation(event.target.value)}
                    placeholder="Location, e.g. Ibadan hub"
                    className={inputClass}
                  />

                  <input
                    value={updateNote}
                    onChange={(event) => setUpdateNote(event.target.value)}
                    placeholder="Note (optional)"
                    className={inputClass}
                  />

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-full border border-black px-5 py-3 text-sm font-semibold transition hover:bg-black hover:text-white disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Add update"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={handleDeliver}
                  disabled={busy}
                  className="w-full rounded-full bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Mark as delivered
                </button>
              </div>
            )}

            {order.status === "delivered" && (
              <p className="mt-3 text-sm text-green-700">
                This order has been delivered.
              </p>
            )}
          </section>

          {/* STATUS */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Update order</h2>

            {canEditStatus ? (
              <>
                <label
                  htmlFor="status"
                  className="mt-5 block text-sm font-medium"
                >
                  Order status
                </label>

                <select
                  id="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className={inputClass}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button
                  type="button"
                  onClick={updateStatus}
                  disabled={busy || status === order.status}
                  className="mt-4 w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Saving..." : "Save status"}
                </button>
              </>
            ) : (
              <p className="mt-3 text-xs leading-5 text-gray-500">
                {isPaid
                  ? "Shipped and delivered orders are updated through the Shipping box above."
                  : "You can update the status once the customer has paid."}
              </p>
            )}
          </section>

          {/* SUMMARY */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-semibold">Order summary</h2>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(order.subtotal, order.currency)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Delivery fee</span>
                <span>
                  {Number(order.shipping_fee) === 0
                    ? "Free"
                    : formatCurrency(order.shipping_fee, order.currency)}
                </span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-4 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total, order.currency)}</span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-400">
              This is the amount the customer paid. Spurax and payment fees
              are taken from it before your payout.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}