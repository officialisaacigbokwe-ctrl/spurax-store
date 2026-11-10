"use client";
import BrandLogo from "@/components/BrandLogo";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!agreed) {
      setMessage("Please agree to the Terms and Privacy Policy to continue.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        data: {
          full_name: name.trim(),
          accepted_terms_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm md:p-10">
        {/* Logo */}
        <div>
          <BrandLogo />
        </div>

        {done ? (
          <div className="mt-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Check your email
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              We sent a confirmation link to{" "}
              <span className="font-medium text-black">{email.trim()}</span>.
              Open it to finish creating your account. If you cannot find it,
              check your spam folder.
            </p>

            <a
              href="/sign-in"
              className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Go to sign in
            </a>
          </div>
        ) : (
          <>
            {/* Heading */}
            <div className="mt-8">
              <h1 className="text-3xl font-bold tracking-tight">
                Create your account
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Join Spurax to shop, track your orders and sell on the
                marketplace.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSignUp} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Full name
                </label>

                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
                />
              </div>

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

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
                />

                <p className="mt-2 text-xs text-gray-400">
                  Use at least 8 characters.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-gray-600">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-1.5 h-4 w-4 shrink-0"
                />

                <span>
                  I am 18 or older and I agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-black underline underline-offset-4"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-black underline underline-offset-4"
                  >
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            {message && (
              <div className="mt-5 rounded-xl bg-[#f3f3f3] p-4 text-sm text-gray-600">
                {message}
              </div>
            )}

            <p className="mt-8 text-center text-sm text-gray-500">
              Already have an account?{" "}
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