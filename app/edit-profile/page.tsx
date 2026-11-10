"use client";
import BrandLogo from "@/components/BrandLogo";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/sign-in");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? "");
        setPhone(profile.phone ?? "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router, supabase]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
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

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMessage("Profile updated successfully.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3]">
        <p className="text-sm text-gray-500">
          Loading your profile...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f3f3]">

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">

          <BrandLogo />

          <a
            href="/account"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            ← Back to account
          </a>

        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-2xl px-6 py-12">

        <div className="rounded-3xl bg-white p-8 shadow-sm md:p-10">

          <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Edit profile
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Update your personal information.
          </p>

          <form onSubmit={handleSave} className="mt-8 space-y-6">

            {/* Full Name */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Full name
              </label>

              <input
                type="text"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Email address
              </label>

              <input
                type="email"
                value={email}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-500"
              />

              <p className="mt-2 text-xs text-gray-400">
                Email changes will be handled separately for account security.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Phone number
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+234..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
              />
            </div>

            {/* Save */}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving changes..." : "Save changes"}
            </button>

          </form>

          {/* Message */}
          {message && (
            <div className="mt-5 rounded-xl bg-[#f3f3f3] p-4 text-sm text-gray-600">
              {message}
            </div>
          )}

        </div>

      </section>
    </main>
  );
}