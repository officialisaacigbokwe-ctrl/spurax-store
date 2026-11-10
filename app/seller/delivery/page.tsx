"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";
import { NIGERIA_STATES, normalizeState } from "@/lib/delivery";

type StoreRow = {
  id: string;
  name: string;
  state: string | null;
  delivery_fee: number | null;
  delivery_fee_other: number | null;
  free_delivery_over: number | null;
  delivery_origin_state: string | null;
  delivery_info: string | null;
};

const COLUMNS =
  "id, name, state, delivery_fee, delivery_fee_other, free_delivery_over, delivery_origin_state, delivery_info";

export default function SellerDeliveryPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");

  const [originState, setOriginState] = useState("");
  const [feeSame, setFeeSame] = useState("0");
  const [feeOther, setFeeOther] = useState("0");
  const [freeOver, setFreeOver] = useState("");
  const [info, setInfo] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to manage delivery.");
        setLoading(false);
        return;
      }

      let store: StoreRow | null = null;
      const activeId = getActiveStoreId();

      if (activeId) {
        const { data } = await supabase
          .from("stores")
          .select(COLUMNS)
          .eq("id", activeId)
          .eq("owner_id", user.id)
          .maybeSingle();

        store = data;
      }

      if (!store) {
        const { data } = await supabase
          .from("stores")
          .select(COLUMNS)
          .eq("owner_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        store = data;

        if (store) {
          setActiveStoreId(store.id);
        }
      }

      if (store) {
        setStoreId(store.id);
        setStoreName(store.name);

        // Preselect the state if we can recognise it
        const known = store.delivery_origin_state || store.state || "";
        const match = NIGERIA_STATES.find(
          (state) => normalizeState(state) === normalizeState(known)
        );

        setOriginState(match || "");
        setFeeSame(String(Number(store.delivery_fee) || 0));
        setFeeOther(String(Number(store.delivery_fee_other) || 0));
        setFreeOver(
          store.free_delivery_over === null
            ? ""
            : String(Number(store.free_delivery_over))
        );
        setInfo(store.delivery_info || "");
      }

      setLoading(false);
    }

    load();
  }, []);

  function validFee(value: string) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 1000000;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!storeId) return;

    setError("");
    setSuccess("");

    if (!originState) {
      setError("Choose the state you ship from.");
      return;
    }

    if (!validFee(feeSame) || !validFee(feeOther)) {
      setError("Delivery fees must be 0 or more (0 means free delivery).");
      return;
    }

    const freeOverText = freeOver.trim();
    let freeOverNumber: number | null = null;

    if (freeOverText !== "") {
      freeOverNumber = Number(freeOverText);

      if (!Number.isFinite(freeOverNumber) || freeOverNumber <= 0) {
        setError(
          "Enter an amount above 0 for free delivery, or leave it empty."
        );
        return;
      }
    }

    setSaving(true);

    const { data, error: updateError } = await supabase
      .from("stores")
      .update({
        delivery_origin_state: originState,
        delivery_fee: Math.round(Number(feeSame) * 100) / 100,
        delivery_fee_other: Math.round(Number(feeOther) * 100) / 100,
        free_delivery_over: freeOverNumber,
        delivery_info: info.trim().slice(0, 200) || null,
      })
      .eq("id", storeId)
      .select("id");

    if (updateError || !data || data.length === 0) {
      console.error(updateError);
      setError("Could not save your delivery settings. Please try again.");
      setSaving(false);
      return;
    }

    setSuccess("Delivery settings saved.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm text-gray-500">Loading delivery settings...</p>
        </div>
      </main>
    );
  }

  if (!storeId) {
    return (
      <main>
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Delivery</h1>

          <p className="mt-3 text-sm text-gray-500">
            {error || "You need a store before you can set up delivery."}
          </p>

          <Link
            href="/create-store"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Create store
          </Link>
        </div>
      </main>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-black";

  return (
    <main>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {storeName}
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">Delivery</h1>

        <p className="mt-2 max-w-2xl text-gray-500">
          Set what customers pay for delivery, depending on where they live.
          For now, delivery is within Nigeria.
        </p>
      </div>

      <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="origin" className="mb-2 block text-sm font-medium">
              State you ship from
            </label>

            <select
              id="origin"
              value={originState}
              onChange={(event) => setOriginState(event.target.value)}
              className={inputClass}
            >
              <option value="">Select a state</option>

              {NIGERIA_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-gray-400">
              Customers in this state pay the lower fee below.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="feeSame"
                className="mb-2 block text-sm font-medium"
              >
                Fee within {originState || "your state"} (NGN)
              </label>

              <input
                id="feeSame"
                type="number"
                min="0"
                step="1"
                value={feeSame}
                onChange={(event) => setFeeSame(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="feeOther"
                className="mb-2 block text-sm font-medium"
              >
                Fee to other states (NGN)
              </label>

              <input
                id="feeOther"
                type="number"
                min="0"
                step="1"
                value={feeOther}
                onChange={(event) => setFeeOther(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <p className="-mt-2 text-xs text-gray-400">
            Enter 0 for free delivery. One flat fee per order.
          </p>

          <div>
            <label
              htmlFor="freeOver"
              className="mb-2 block text-sm font-medium"
            >
              Free delivery on orders above (NGN, optional)
            </label>

            <input
              id="freeOver"
              type="number"
              min="0"
              step="1"
              value={freeOver}
              onChange={(event) => setFreeOver(event.target.value)}
              placeholder="Leave empty if you do not offer this"
              className={inputClass}
            />

            <p className="mt-2 text-xs text-gray-400">
              Based on the price of the products, before delivery.
            </p>
          </div>

          <div>
            <label htmlFor="info" className="mb-2 block text-sm font-medium">
              Delivery information
            </label>

            <input
              id="info"
              type="text"
              maxLength={200}
              value={info}
              onChange={(event) => setInfo(event.target.value)}
              placeholder="e.g. Delivery within 2 to 5 working days"
              className={inputClass}
            />

            <p className="mt-2 text-xs text-gray-400">
              Shown to customers at checkout. {info.length}/200
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save delivery settings"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-3xl bg-white p-7 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          Good to know
        </p>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Delivery is your responsibility. Spurax does not deliver orders for
          sellers yet. You keep the delivery fee as part of your payment, after
          Spurax's platform fee.
        </p>
      </section>
    </main>
  );
}