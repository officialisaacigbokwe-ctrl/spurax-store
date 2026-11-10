import { createAdminClient } from "@/lib/supabase/admin";
import { button, emailLayout, esc, sendEmail } from "@/lib/email";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
    }).format(Number(amount));
  } catch {
    return `${currency} ${Number(amount).toLocaleString()}`;
  }
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

async function loadOrder(orderId: string) {
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(
      "id, store_id, subtotal, shipping_fee, total, currency, customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_state, shipping_country, carrier, tracking_number, shipped_from, estimated_delivery"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return null;

  const { data: items } = await admin
    .from("order_items")
    .select("product_name, quantity, unit_price, size, color")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const { data: store } = order.store_id
    ? await admin
        .from("stores")
        .select("name, owner_id, contact_email")
        .eq("id", order.store_id)
        .maybeSingle()
    : { data: null };

  return { order, items: items ?? [], store };
}

function itemsTable(
  items: {
    product_name: string;
    quantity: number;
    unit_price: number;
    size: string | null;
    color: string | null;
  }[],
  currency: string
) {
  const rows = items
    .map((item) => {
      const details = [item.size, item.color].filter(Boolean).join(" · ");

      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;">
          ${esc(item.product_name)} × ${esc(item.quantity)}
          ${details ? `<br><span style="color:#888;font-size:12px;">${esc(details)}</span>` : ""}
        </td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px;">
          ${esc(money(Number(item.unit_price) * item.quantity, currency))}
        </td>
      </tr>`;
    })
    .join("");

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

function totals(order: {
  subtotal: number;
  shipping_fee: number;
  total: number;
  currency: string;
}) {
  const fee =
    Number(order.shipping_fee) === 0
      ? "Free"
      : money(order.shipping_fee, order.currency);

  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
    <tr><td style="padding:4px 0;color:#666;">Subtotal</td><td align="right">${esc(money(order.subtotal, order.currency))}</td></tr>
    <tr><td style="padding:4px 0;color:#666;">Delivery</td><td align="right">${esc(fee)}</td></tr>
    <tr><td style="padding:8px 0;font-weight:bold;">Total</td><td align="right" style="font-weight:bold;">${esc(money(order.total, order.currency))}</td></tr>
  </table>`;
}

function addressBlock(order: {
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_country: string | null;
}) {
  const lines = [
    order.customer_name,
    order.customer_phone,
    order.shipping_address,
    [order.shipping_city, order.shipping_state].filter(Boolean).join(", "),
    order.shipping_country,
  ].filter(Boolean);

  return lines.map((line) => esc(line)).join("<br>");
}

// ---- Payment confirmed: tell the buyer and the seller ----
export async function notifyOrderPaid(orderId: string) {
  try {
    const data = await loadOrder(orderId);

    if (!data) return;

    const { order, items, store } = data;
    const admin = createAdminClient();

    // Buyer
    if (order.customer_email) {
      const html = emailLayout(
        "Your order is confirmed",
        `<p style="font-size:14px;line-height:1.6;">Hi ${esc(order.customer_name || "there")}, thank you for your order. Your payment was received${
          store?.name ? ` and <strong>${esc(store.name)}</strong> has been notified` : ""
        }.</p>
         <p style="font-size:13px;color:#888;">Order #${esc(shortId(order.id))}</p>
         ${itemsTable(items, order.currency)}
         ${totals(order)}
         <p style="margin:20px 0 4px;font-size:13px;color:#888;">Delivering to</p>
         <p style="margin:0;font-size:14px;line-height:1.6;">${addressBlock(order)}</p>
         ${button(`${siteUrl()}/orders/${order.id}`, "View your order")}`
      );

      await sendEmail({
        to: order.customer_email,
        subject: `Your Spurax order #${shortId(order.id)} is confirmed`,
        html,
      });
    }

    // Seller: the store owner, plus the store contact email if it is different
    if (store) {
      const recipients = new Set<string>();

      if (store.owner_id) {
        const { data: owner } = await admin.auth.admin.getUserById(store.owner_id);

        if (owner?.user?.email) {
          recipients.add(owner.user.email.toLowerCase());
        }
      }

      if (store.contact_email) {
        recipients.add(String(store.contact_email).toLowerCase());
      }

      if (recipients.size > 0) {
        const html = emailLayout(
          "You have a new paid order",
          `<p style="font-size:14px;line-height:1.6;">A customer has paid for an order in <strong>${esc(store.name)}</strong>. Please prepare it for delivery.</p>
           <p style="font-size:13px;color:#888;">Order #${esc(shortId(order.id))}</p>
           ${itemsTable(items, order.currency)}
           ${totals(order)}
           <p style="margin:20px 0 4px;font-size:13px;color:#888;">Customer and delivery address</p>
           <p style="margin:0;font-size:14px;line-height:1.6;">${addressBlock(order)}</p>
           ${button(`${siteUrl()}/seller/orders/${order.id}`, "Open the order")}`
        );

        await sendEmail({
          to: [...recipients],
          subject: `New paid order #${shortId(order.id)} on ${store.name}`,
          html,
        });
      }
    }
  } catch (error) {
    console.error("notifyOrderPaid error:", error);
  }
}

// ---- Seller marked it shipped: tell the buyer ----
export async function notifyOrderShipped(orderId: string) {
  try {
    const data = await loadOrder(orderId);

    if (!data || !data.order.customer_email) return;

    const { order, store } = data;

    const estimated = order.estimated_delivery
      ? new Date(order.estimated_delivery).toLocaleDateString("en-NG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

    const html = emailLayout(
      "Your order has shipped",
      `<p style="font-size:14px;line-height:1.6;">Good news ${esc(order.customer_name || "")}, your order from <strong>${esc(store?.name || "the seller")}</strong> is on its way.</p>
       <p style="font-size:13px;color:#888;">Order #${esc(shortId(order.id))}</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0;">
         <tr><td style="padding:4px 0;color:#666;">Courier</td><td align="right">${esc(order.carrier || "-")}</td></tr>
         <tr><td style="padding:4px 0;color:#666;">Tracking</td><td align="right">${esc(order.tracking_number || "-")}</td></tr>
         <tr><td style="padding:4px 0;color:#666;">Shipped from</td><td align="right">${esc(order.shipped_from || "-")}</td></tr>
         <tr><td style="padding:4px 0;color:#666;">Estimated delivery</td><td align="right">${esc(estimated || "-")}</td></tr>
       </table>
       ${button(`${siteUrl()}/orders/${order.id}/track`, "Track your order")}`
    );

    await sendEmail({
      to: order.customer_email,
      subject: `Your Spurax order #${shortId(order.id)} has shipped`,
      html,
    });
  } catch (error) {
    console.error("notifyOrderShipped error:", error);
  }
}

// ---- Seller marked it delivered: tell the buyer ----
export async function notifyOrderDelivered(orderId: string) {
  try {
    const data = await loadOrder(orderId);

    if (!data || !data.order.customer_email) return;

    const { order, store } = data;

    const html = emailLayout(
      "Your order was delivered",
      `<p style="font-size:14px;line-height:1.6;">Your order from <strong>${esc(store?.name || "the seller")}</strong> has been marked as delivered. We hope you enjoy it.</p>
       <p style="font-size:13px;color:#888;">Order #${esc(shortId(order.id))}</p>
       <p style="font-size:13px;line-height:1.6;color:#666;">If you have not received it, please contact the seller${
         store?.name ? ` (${esc(store.name)})` : ""
       } as soon as possible.</p>
       ${button(`${siteUrl()}/orders/${order.id}`, "View your order")}`
    );

    await sendEmail({
      to: order.customer_email,
      subject: `Your Spurax order #${shortId(order.id)} was delivered`,
      html,
    });
  } catch (error) {
    console.error("notifyOrderDelivered error:", error);
  }
}