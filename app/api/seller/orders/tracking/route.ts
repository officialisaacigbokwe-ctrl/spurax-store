import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOrderShipped, notifyOrderDelivered } from "@/lib/order-emails";

export const runtime = "nodejs";

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail("Please sign in.", 401);
    }

    const body = await request.json().catch(() => null);
    const orderId = clean(body?.orderId, 80);
    const action = clean(body?.action, 20);

    if (!orderId) {
      return fail("A valid order is required.");
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, store_id, status, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order || !order.store_id) {
      return fail("Order not found.", 404);
    }

    // The signed-in user must belong to the store this order was placed in.
    const { data: membership } = await admin
      .from("store_memberships")
      .select("store_id")
      .eq("user_id", user.id)
      .eq("store_id", order.store_id)
      .maybeSingle();

    if (!membership) {
      return fail("You do not have access to this order.", 403);
    }

    if (order.payment_status !== "paid") {
      return fail("Only paid orders can be shipped.");
    }

    const location = clean(body?.location, 120);
    const note = clean(body?.note, 300);
    const now = new Date().toISOString();

    // ---- Mark as shipped ----
    if (action === "ship") {
      const carrier = clean(body?.carrier, 80);
      const trackingNumber = clean(body?.trackingNumber, 80);
      const shippedFrom = clean(body?.shippedFrom, 120);
      const estimated = clean(body?.estimatedDelivery, 20);

      if (!carrier || !shippedFrom) {
        return fail("Enter the courier or rider and where it ships from.");
      }

      if (
        estimated &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(estimated) ||
          Number.isNaN(new Date(estimated).getTime()))
      ) {
        return fail("Enter a valid estimated delivery date.");
      }

      // Only works if the order is still waiting to be shipped.
      const { data: updated } = await admin
        .from("orders")
        .update({
          status: "shipped",
          carrier,
          tracking_number: trackingNumber || null,
          shipped_from: shippedFrom,
          estimated_delivery: estimated || null,
          shipped_at: now,
        })
        .eq("id", order.id)
        .in("status", ["pending", "processing"])
        .select("id");

      if (!updated || updated.length === 0) {
        return fail("This order is not waiting to be shipped.");
      }

      await admin.from("order_tracking_events").insert({
        order_id: order.id,
        store_id: order.store_id,
        event_type: "shipped",
        location: shippedFrom,
        note: note || null,
        created_by: user.id,
      });

      await notifyOrderShipped(order.id);

      return NextResponse.json({ ok: true });
    }

    // ---- Add a movement update ----
    if (action === "update") {
      const eventType = clean(body?.eventType, 30);

      if (eventType !== "in_transit" && eventType !== "out_for_delivery") {
        return fail("Choose a valid update type.");
      }

      if (!location) {
        return fail("Enter the location for this update.");
      }

      if (order.status !== "shipped") {
        return fail("You can only add updates to a shipped order.");
      }

      const { error: insertError } = await admin
        .from("order_tracking_events")
        .insert({
          order_id: order.id,
          store_id: order.store_id,
          event_type: eventType,
          location,
          note: note || null,
          created_by: user.id,
        });

      if (insertError) {
        console.error("Tracking update error:", insertError.message);
        return fail("Could not save the update.", 500);
      }

      return NextResponse.json({ ok: true });
    }

    // ---- Mark as delivered ----
    if (action === "deliver") {
      const { data: updated } = await admin
        .from("orders")
        .update({ status: "delivered", delivered_at: now })
        .eq("id", order.id)
        .eq("status", "shipped")
        .select("id");

      if (!updated || updated.length === 0) {
        return fail("Only a shipped order can be marked as delivered.");
      }

      await admin.from("order_tracking_events").insert({
        order_id: order.id,
        store_id: order.store_id,
        event_type: "delivered",
        location: location || null,
        note: note || null,
        created_by: user.id,
      });

      await notifyOrderDelivered(order.id);

      return NextResponse.json({ ok: true });
    }

    return fail("Unknown action.");
  } catch (error) {
    console.error("Tracking route error:", error);
    return fail("Something went wrong. Please try again.", 500);
  }
}