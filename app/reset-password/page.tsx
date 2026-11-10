"use client";
import BrandLogo from "@/components/BrandLogo";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setHasSession(Boolean(user));
      setChecking(false);
    }

    check();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");

    if (password.length < 8) {
      setMessage("Your password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("The two passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    // Sign out every other device after a reset, for safety.
    await supabase.auth.signOut({ scope: "others" });

    setDone(true);
    setLoading(false);

    setTimeout(() => {
      router.replace("/account");
      router.refresh();
    }, 1800);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <div>
          <BrandLogo />
        </div>

        {checking ? (
          <p className="mt-8 text-sm text-gray-500">Checking your link...</p>
        ) : !hasSession ? (
          <div className="mt-8">
            <h1 className="text-3xl font-bold tracking-tight">
              This link has expired
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Reset links work once and only for a short time, and they must be
              opened in the same browser where you asked for them. Please
              request a new one.
            </p>

            <a
              href="/forgot-password"
              className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Request a new link
            </a>
          </div>
        ) : done ? (
          <div className="mt-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Password updated
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Your new password is saved. Taking you to your account...
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <h1 className="text-3xl font-bold tracking-tight">
                Choose a new password
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Use at least 8 characters.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
                />
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save new password"}
              </button>
            </form>

            {message && (
              <div className="mt-5 rounded-xl bg-[#f3f3f3] p-4 text-sm text-gray-600">
                {message}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}