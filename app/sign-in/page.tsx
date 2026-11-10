"use client";
import BrandLogo from "@/components/BrandLogo";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Only allow going to a page inside our own site.
function getNextPath() {
  if (typeof window === "undefined") return "/account";

  const next = new URLSearchParams(window.location.search).get("next") || "";

  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");

    if (error === "link") {
      setMessage(
        "That link is invalid or has expired. Please request a new one."
      );
    }
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const text = error.message.toLowerCase();

      if (text.includes("invalid login")) {
        setMessage("Incorrect email or password.");
      } else if (text.includes("not confirmed")) {
        setMessage(
          "Please confirm your email first. Check your inbox for the confirmation link."
        );
      } else {
        setMessage(error.message);
      }

      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("We could not sign you in. Please try again.");
      setLoading(false);
      return;
    }

    router.replace(getNextPath());
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm md:p-10">
        {/* Logo */}
        <div>
          <BrandLogo />
        </div>

        {/* Heading */}
        <div className="mt-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Sign in to manage your orders, profile and store.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignIn} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
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
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>

              <a
                href="/forgot-password"
                className="text-xs font-medium text-gray-500 underline underline-offset-4 hover:text-black"
              >
                Forgot password?
              </a>
            </div>

            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-sm outline-none transition focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-black py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message && (
          <div className="mt-5 rounded-xl bg-[#f3f3f3] p-4 text-sm text-gray-600">
            {message}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-500">
          New to Spurax?{" "}
          <a
            href="/sign-up"
            className="font-semibold text-black underline underline-offset-4"
          >
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}