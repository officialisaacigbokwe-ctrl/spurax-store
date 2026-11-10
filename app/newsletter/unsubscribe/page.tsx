"use client";

import { useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";

export default function UnsubscribePage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") || "");
  }, []);

  async function unsubscribe() {
    setStatus("loading");

    const response = await fetch("/api/newsletter/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    setStatus(response.ok ? "done" : "error");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f3f3] px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <BrandLogo />

        {status === "done" ? (
          <div className="mt-8">
            <h1 className="text-2xl font-bold tracking-tight">You are unsubscribed</h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              You will not receive our newsletter any more. You can subscribe
              again at any time from our home page.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Unsubscribe from our newsletter?
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Press the button to stop receiving emails from Spurax Global
              Marketplace.
            </p>

            {!token ? (
              <p className="mt-5 text-sm text-red-600">
                This link is not valid. Please use the link in the email.
              </p>
            ) : (
              <button
                type="button"
                onClick={unsubscribe}
                disabled={status === "loading"}
                className="mt-6 rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {status === "loading" ? "Please wait..." : "Unsubscribe"}
              </button>
            )}

            {status === "error" && (
              <p className="mt-4 text-sm text-red-600">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}