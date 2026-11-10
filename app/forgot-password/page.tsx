"use client";
import BrandLogo from "@/components/BrandLogo";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      const text = error.message.toLowerCase();

      setMessage(
        text.includes("rate limit")
          ? "Too many requests. Please wait a few minutes and try again."
          : "We could not send the email. Please try again."
      );

      setLoading(false);
      return;
    }

    // Same message whether or not the email has an account, so nobody
    // can use this form to find out who is registered.
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <div>
          <BrandLogo />
        </div>

        {sent ? (
          <div className="mt-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Check your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              If an account exists for{" "}
              <span className="font-medium text-black">{email.trim()}</span>,
              we have sent a link to reset the password. Open it on this same
              device and browser. If you do not see it, check your spam folder.
            </p>

            <a
              href="/sign-in"
              className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <h1 className="text-3xl font-bold tracking-tight">
                Forgot your password?
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Enter your email and we will send you a link to choose a new
                one.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            {message && (
              <div className="mt-5 rounded-xl bg-[#f3f3f3] p-4 text-sm text-gray-600">
                {message}
              </div>
            )}

            <p className="mt-8 text-center text-sm text-gray-500">
              Remembered it?{" "}
              <a
                href="/sign-in"
                className="font-semibold text-black underline underline-offset-4"
              >
                Sign in
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}