"use client";
import BrandLogo from "@/components/BrandLogo";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/sign-in?next=/settings");
        return;
      }

      setEmail(user.email ?? "");
      setLoading(false);
    }

    load();
  }, [router, supabase]);

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("The two new passwords do not match.");
      return;
    }

    if (password === current) {
      setError("Your new password must be different from the current one.");
      return;
    }

    setSaving(true);

    // Check the current password first.
    const { error: checkError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });

    if (checkError) {
      setError("Your current password is incorrect.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // Sign out every other device.
    await supabase.auth.signOut({ scope: "others" });

    setCurrent("");
    setPassword("");
    setConfirm("");
    setSuccess("Your password has been changed.");
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3]">
        <p className="text-sm text-gray-500">Loading your settings...</p>
      </main>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black";

  return (
    <main className="min-h-screen bg-[#f3f3f3]">
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

      <section className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
          Account
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Settings and security
        </h1>

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold">Sign-in email</h2>

          <p className="mt-3 text-sm text-gray-600">{email}</p>

          <p className="mt-2 text-xs text-gray-400">
            Email changes will be handled separately for account security.
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold">Change password</h2>

          <p className="mt-2 text-sm text-gray-500">
            You will stay signed in here. Other devices will be signed out.
          </p>

          <form onSubmit={handleChangePassword} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="current"
                className="mb-2 block text-sm font-medium"
              >
                Current password
              </label>

              <input
                id="current"
                type="password"
                required
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                New password
              </label>

              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />

              <p className="mt-2 text-xs text-gray-400">
                Use at least 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="mb-2 block text-sm font-medium"
              >
                Confirm new password
              </label>

              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className={inputClass}
              />
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
              className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Change password"}
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold">Sign out</h2>

          <p className="mt-2 text-sm text-gray-500">
            Sign out of your Spurax account on this device.
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-5 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-black hover:text-white"
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}