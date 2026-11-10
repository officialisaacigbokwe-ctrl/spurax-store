"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CartItem, getCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/currency";
import { createClient } from "@/lib/supabase/client";
import {
  DeliveryRates,
  NIGERIA_STATES,
  calculateDeliveryFee,
} from "@/lib/delivery";

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");

  // For now we deliver within Nigeria only.
  const deliveryCountry = "Nigeria";

  const [deliveryRates, setDeliveryRates] = useState<DeliveryRates | null>(
    null
  );
  const [deliveryInfo, setDeliveryInfo] = useState("");

  useEffect(() => {
    setCart(getCart());

    const paymentStatus = searchParams.get("payment");

    if (paymentStatus === "failed") {
      setErrorMessage(
        "Payment was not completed. You can review your cart and try again."
      );
    }
  }, [searchParams]);

  // Load the delivery rates of the store the cart belongs to.
  useEffect(() => {
    async function loadDelivery() {
      if (cart.length === 0) {
        setDeliveryRates(null);
        return;
      }

      const { data: products } = await supabase
        .from("products")
        .select("store_id")
        .in("id", [...new Set(cart.map((item) => item.productId))]);

      const storeIds = [
        ...new Set(
          (products ?? [])
            .map((product) => product.store_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      if (storeIds.length !== 1) {
        setDeliveryRates(null);
        return;
      }

      const { data: store } = await supabase
        .from("stores")
        .select(
          "delivery_fee, delivery_fee_other, free_delivery_over, delivery_origin_state, state, delivery_info"
        )
        .eq("id", storeIds[0])
        .maybeSingle();

      if (store) {
        setDeliveryRates({
          feeSameState: Number(store.delivery_fee) || 0,
          feeOtherStates: Number(store.delivery_fee_other) || 0,
          freeOver:
            store.free_delivery_over == null
              ? null
              : Number(store.free_delivery_over),
          originState: store.delivery_origin_state || store.state || null,
        });
        setDeliveryInfo(store.delivery_info || "");
      } else {
        setDeliveryRates(null);
      }
    }

    loadDelivery();
  }, [cart]);

  const currency = cart[0]?.currency || "NGN";

  const subtotal = cart.reduce(
    (total, item) =>
      total + Number(item.price) * Number(item.quantity),
    0
  );

  const deliveryFee =
    deliveryRates && deliveryState
      ? calculateDeliveryFee(deliveryRates, deliveryState, subtotal)
      : null;

  const grandTotal = subtotal + (deliveryFee ?? 0);

  const amountToFree =
    deliveryRates &&
    deliveryRates.freeOver !== null &&
    deliveryFee !== null &&
    deliveryFee > 0 &&
    subtotal < deliveryRates.freeOver
      ? deliveryRates.freeOver - subtotal
      : null;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMessage("");

    try {
      if (cart.length === 0) {
        throw new Error("Your cart is empty.");
      }

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setLoading(false);
        router.push("/sign-in");
        return;
      }

      // 1. Ask the server to create the order.
      // We only send WHAT the buyer chose and WHERE to deliver.
      // The server looks up the real prices and delivery fee itself.
      const orderResponse = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            size: item.size || "",
            color: item.color || "",
            quantity: Number(item.quantity),
          })),
          customer: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
          },
          shipping: {
            address: deliveryAddress.trim(),
            city: deliveryCity.trim(),
            state: deliveryState,
            country: deliveryCountry,
          },
        }),
      });

      const orderResult = await orderResponse.json().catch(() => null);

      if (orderResponse.status === 401) {
        setLoading(false);
        router.push("/sign-in");
        return;
      }

      if (
        !orderResponse.ok ||
        typeof orderResult?.orderId !== "string"
      ) {
        throw new Error(
          orderResult?.error ||
            "Could not create your order. Please try again."
        );
      }

      // 2. Initialize payment on the server.
      const paymentResponse = await fetch(
        "/api/payments/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderResult.orderId,
          }),
        }
      );

      const paymentResult = await paymentResponse.json();

      if (
        !paymentResponse.ok ||
        typeof paymentResult.authorizationUrl !== "string" ||
        !paymentResult.authorizationUrl.startsWith("https://")
      ) {
        throw new Error(
          paymentResult.error ||
            "Could not start payment. Please try again."
        );
      }

      // 3. Redirect to Paystack's hosted checkout.
      window.location.assign(paymentResult.authorizationUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-black";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold">Checkout</h1>

          <p className="mt-2 text-sm text-gray-500">
            Enter your delivery details to continue to secure payment.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="customerName" className="mb-1 block text-sm font-medium">
                Full name
              </label>
              <input
                id="customerName"
                type="text"
                autoComplete="name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="customerEmail" className="mb-1 block text-sm font-medium">
                Email address
              </label>
              <input
                id="customerEmail"
                type="email"
                autoComplete="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="customerPhone" className="mb-1 block text-sm font-medium">
                Phone number
              </label>
              <input
                id="customerPhone"
                type="tel"
                autoComplete="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="deliveryAddress" className="mb-1 block text-sm font-medium">
                Delivery address
              </label>
              <textarea
                id="deliveryAddress"
                autoComplete="street-address"
                required
                rows={3}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="deliveryCity" className="mb-1 block text-sm font-medium">
                  City / Area
                </label>
                <input
                  id="deliveryCity"
                  type="text"
                  autoComplete="address-level2"
                  required
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="deliveryState" className="mb-1 block text-sm font-medium">
                  State
                </label>
                <select
                  id="deliveryState"
                  required
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select your state</option>

                  {NIGERIA_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="deliveryCountry" className="mb-1 block text-sm font-medium">
                Country
              </label>
              <input
                id="deliveryCountry"
                type="text"
                readOnly
                value={deliveryCountry}
                className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-500`}
              />
              <p className="mt-1 text-xs text-gray-400">
                We currently deliver within Nigeria only.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || cart.length === 0}
              className="w-full rounded-xl bg-black px-5 py-3.5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Opening secure checkout..." : "Pay with Paystack"}
            </button>

            <p className="text-xs text-gray-500">
              You will be redirected to Paystack to complete your payment securely.
            </p>
          </form>
        </section>

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Order summary</h2>

          {cart.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              Your cart is empty.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {cart.map((item, index) => (
                <div
                  key={`${item.productId}-${item.size || ""}-${item.color || ""}-${index}`}
                  className="flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Qty: {item.quantity}
                      {item.size ? ` · Size: ${item.size}` : ""}
                      {item.color ? ` · Color: ${item.color}` : ""}
                    </p>
                  </div>

                  <p className="whitespace-nowrap text-sm font-medium">
                    {formatCurrency(
                      Number(item.price) * Number(item.quantity),
                      item.currency
                    )}
                  </p>
                </div>
              ))}

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-gray-500">Delivery</span>
                  <span>
                    {deliveryFee === null
                      ? deliveryRates
                        ? "Choose your state"
                        : "Calculated at payment"
                      : deliveryFee === 0
                        ? "Free"
                        : formatCurrency(deliveryFee, currency)}
                  </span>
                </div>

                {amountToFree !== null && (
                  <p className="mt-2 text-xs text-green-700">
                    Add {formatCurrency(amountToFree, currency)} more to get
                    free delivery.
                  </p>
                )}

                {deliveryInfo && (
                  <p className="mt-2 text-xs text-gray-500">
                    {deliveryInfo}
                  </p>
                )}

                <div className="mt-4 flex justify-between border-t border-gray-200 pt-4 text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(grandTotal, currency)}</span>
                </div>

                <p className="mt-3 text-xs text-gray-400">
                  Delivery is arranged by the seller.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}