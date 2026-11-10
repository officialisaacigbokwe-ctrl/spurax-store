"use client";
import BrandLogo from "@/components/BrandLogo";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Address = {
  id: string;
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  is_default: boolean;
};

export default function AddressesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [postalCode, setPostalCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/sign-in");
      return;
    }

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setAddresses(data ?? []);
    }

    setLoading(false);
  }

  async function handleAddAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/sign-in");
      return;
    }

    // If this address is becoming the default,
    // remove default status from existing addresses.
    if (isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const { error } = await supabase.from("addresses").insert({
      user_id: user.id,
      full_name: fullName,
      phone,
      address_line: addressLine,
      city,
      state,
      country,
      postal_code: postalCode || null,
      is_default: isDefault,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setFullName("");
    setPhone("");
    setAddressLine("");
    setCity("");
    setState("");
    setCountry("Nigeria");
    setPostalCode("");
    setIsDefault(false);

    setMessage("Address added successfully.");

    await loadAddresses();

    setSaving(false);
  }

  async function handleDeleteAddress(id: string) {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setAddresses((current) =>
      current.filter((address) => address.id !== id)
    );
  }

  async function handleSetDefault(id: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/sign-in");
      return;
    }

    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);

    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadAddresses();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3]">
        <p className="text-sm text-gray-500">
          Loading your addresses...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3]">

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <BrandLogo />

          <a
            href="/account"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            ← Back to account
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">

        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Delivery
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Your addresses
          </h1>

          <p className="mt-3 text-gray-500">
            Save your delivery details for a faster checkout.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">

          {/* Add Address */}
          <div className="rounded-3xl bg-white p-7 shadow-sm">

            <h2 className="text-xl font-semibold">
              Add a new address
            </h2>

            <form
              onSubmit={handleAddAddress}
              className="mt-6 space-y-4"
            >

              <input
                type="text"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
              />

              <input
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone number"
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
              />

              <textarea
                required
                value={addressLine}
                onChange={(event) => setAddressLine(event.target.value)}
                placeholder="Street address"
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
              />

              <div className="grid gap-4 sm:grid-cols-2">

                <input
                  type="text"
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="City"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
                />

                <input
                  type="text"
                  required
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  placeholder="State"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
                />

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <input
                  type="text"
                  required
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="Country"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
                />

                <input
                  type="text"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                  placeholder="Postal code (optional)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none focus:border-black"
                />

              </div>

              <label className="flex cursor-pointer items-center gap-3 pt-2 text-sm">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) =>
                    setIsDefault(event.target.checked)
                  }
                  className="h-4 w-4"
                />

                Make this my default address
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {saving ? "Saving address..." : "Add address"}
              </button>

            </form>

            {message && (
              <div className="mt-5 rounded-xl bg-[#f3f3f3] p-4 text-sm text-gray-600">
                {message}
              </div>
            )}

          </div>

          {/* Saved Addresses */}
          <div>

            <h2 className="text-xl font-semibold">
              Saved addresses
            </h2>

            {addresses.length === 0 ? (
              <div className="mt-5 rounded-3xl bg-white p-8 text-center shadow-sm">
                <p className="text-gray-500">
                  You haven't saved any addresses yet.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">

                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-3xl bg-white p-6 shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {address.full_name}
                          </h3>

                          {address.is_default && (
                            <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                              Default
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-sm leading-6 text-gray-500">
                          {address.address_line}
                          <br />
                          {address.city}, {address.state}
                          <br />
                          {address.country}
                          {address.postal_code &&
                            `, ${address.postal_code}`}
                        </p>

                        <p className="mt-3 text-sm text-gray-500">
                          {address.phone}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          handleDeleteAddress(address.id)
                        }
                        className="text-sm font-medium text-gray-400 transition hover:text-black"
                      >
                        Delete
                      </button>

                    </div>

                    {!address.is_default && (
                      <button
                        onClick={() =>
                          handleSetDefault(address.id)
                        }
                        className="mt-5 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium transition hover:bg-black hover:text-white"
                      >
                        Make default
                      </button>
                    )}

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>

      </section>
    </main>
  );
}