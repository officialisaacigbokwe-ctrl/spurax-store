import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateDeliveryFee } from "@/lib/delivery";

export const runtime = "nodejs";

type IncomingItem = {
  productId: string;
  size: string;
  color: string;
  quantity: number;
};

function clean(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in before placing an order." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);

    // ---- 1. Read and validate what the browser sent ----
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    if (rawItems.length === 0 || rawItems.length > 50) {
      return NextResponse.json(
        { error: "Your cart is empty or too large." },
        { status: 400 }
      );
    }

    const items: IncomingItem[] = [];

    for (const raw of rawItems) {
      const quantity = Number(raw?.quantity);

      if (
        typeof raw?.productId !== "string" ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        return NextResponse.json(
          { error: "One of the items in your cart is invalid." },
          { status: 400 }
        );
      }

      items.push({
        productId: raw.productId,
        size: clean(raw.size, 50),
        color: clean(raw.color, 50),
        quantity,
      });
    }

    const customerName = clean(body?.customer?.name, 120);
    const customerPhone = clean(body?.customer?.phone, 40);
    const customerEmail = clean(body?.customer?.email, 200) || user.email || "";

    const shippingAddress = clean(body?.shipping?.address, 300);
    const shippingCity = clean(body?.shipping?.city, 100);
    const shippingState = clean(body?.shipping?.state, 100);
    const shippingCountry = clean(body?.shipping?.country, 100);

    if (
      !customerName ||
      !customerPhone ||
      !customerEmail.includes("@") ||
      !shippingAddress ||
      !shippingCity ||
      !shippingState ||
      !shippingCountry
    ) {
      return NextResponse.json(
        { error: "Please fill in all your delivery details." },
        { status: 400 }
      );
    }

    // ---- 2. Load the REAL products from the database ----
    const productIds = [...new Set(items.map((item) => item.productId))];

    const { data: products, error: productsError } = await admin
      .from("products")
      .select(
        "id, name, price, currency, image_url, images, sizes, colors, is_active, store_id"
      )
      .in("id", productIds);

    if (productsError || !products) {
      return NextResponse.json(
        { error: "Could not check your products. Please try again." },
        { status: 500 }
      );
    }

    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product || product.is_active === false) {
        return NextResponse.json(
          {
            error:
              "One of the products in your cart is no longer available. Please remove it and try again.",
          },
          { status: 400 }
        );
      }

      const sizes: string[] = Array.isArray(product.sizes) ? product.sizes : [];
      const colors: string[] = Array.isArray(product.colors) ? product.colors : [];

      if (sizes.length > 0 && !sizes.includes(item.size)) {
        return NextResponse.json(
          { error: `Please choose a valid size for ${product.name}.` },
          { status: 400 }
        );
      }

      if (colors.length > 0 && !colors.includes(item.color)) {
        return NextResponse.json(
          { error: `Please choose a valid color for ${product.name}.` },
          { status: 400 }
        );
      }
    }

    // One order = one store and one currency
    const storeIds = new Set(products.map((product) => product.store_id));
    const currencies = new Set(products.map((product) => product.currency));

    if (storeIds.size !== 1 || !products[0].store_id) {
      return NextResponse.json(
        {
          error:
            "Your cart has products from different stores. Please check out one store at a time.",
        },
        { status: 400 }
      );
    }

    if (currencies.size !== 1) {
      return NextResponse.json(
        { error: "Your cart has products in different currencies." },
        { status: 400 }
      );
    }

    const storeId = products[0].store_id as string;
    const currency = String(products[0].currency);

    if (currency !== "NGN") {
      return NextResponse.json(
        { error: "Payments are currently available for NGN products only." },
        { status: 400 }
      );
    }

    // ---- 3. The store must be active and able to receive money ----
    const { data: store } = await admin
      .from("stores")
           .select(
        "id, is_active, delivery_fee, delivery_fee_other, free_delivery_over, delivery_origin_state, state"
      )
      .eq("id", storeId)
      .maybeSingle();

    if (!store || store.is_active === false) {
      return NextResponse.json(
        { error: "This store is not available right now." },
        { status: 400 }
      );
    }

    const { data: payoutAccount } = await admin
      .from("store_payout_accounts")
      .select("subaccount_code")
      .eq("store_id", storeId)
      .maybeSingle();

    if (!payoutAccount?.subaccount_code) {
      return NextResponse.json(
        {
          error:
            "This store has not finished setting up payments yet, so it cannot accept orders.",
          code: "store_payouts_not_ready",
        },
        { status: 400 }
      );
    }

    // ---- 4. Work out the price on the server ----
    let subtotal = 0;

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      subtotal += Number(product.price) * item.quantity;
    }

        if (shippingCountry.trim().toLowerCase() !== "nigeria") {
      return NextResponse.json(
        { error: "We currently deliver within Nigeria only." },
        { status: 400 }
      );
    }

    const shippingFee = calculateDeliveryFee(
      {
        feeSameState: Number(store.delivery_fee) || 0,
        feeOtherStates: Number(store.delivery_fee_other) || 0,
        freeOver:
          store.free_delivery_over == null
            ? null
            : Number(store.free_delivery_over),
        originState: store.delivery_origin_state || store.state || null,
      },
      shippingState,
      subtotal
    );
    const total = subtotal + shippingFee;

    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        { error: "The order total is invalid." },
        { status: 400 }
      );
    }

    // ---- 5. Create the order ----
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        store_id: storeId,
        status: "pending",
        payment_status: "unpaid",
        subtotal,
        shipping_fee: shippingFee,
        total,
        currency,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_country: shippingCountry,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError?.message);

      return NextResponse.json(
        { error: "Could not create your order. Please try again." },
        { status: 500 }
      );
    }

    // ---- 6. Create the order items ----
    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const images: string[] = Array.isArray(product.images) ? product.images : [];

      return {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        product_image_url: product.image_url || images[0] || null,
        quantity: item.quantity,
        unit_price: Number(product.price),
        size: item.size || null,
        color: item.color || null,
      };
    });

    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items insert error:", itemsError.message);

      // Clean up so no empty order is left behind
      await admin.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        { error: "Could not save your order items. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    console.error("Create order error:", error);

    return NextResponse.json(
      { error: "Could not create your order. Please try again." },
      { status: 500 }
    );
  }
}