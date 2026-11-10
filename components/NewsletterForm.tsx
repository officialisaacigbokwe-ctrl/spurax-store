"use client";

import { FormEvent, useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus("error");
        setMessage(result?.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Connection problem. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <p className="mt-6 rounded-2xl bg-white px-5 py-4 text-sm font-medium text-green-700">
        Thank you! Please check your inbox, and your spam folder, for a
        welcome email.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-6 max-w-md">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          aria-label="Email address"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-full border border-gray-200 bg-white px-5 py-3.5 text-sm outline-none focus:border-black"
        />

        {/* Hidden from people. Bots tend to fill it in. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {status === "loading" ? "Please wait..." : "Subscribe"}
        </button>
      </div>

      {status === "error" && (
        <p className="mt-3 text-sm text-red-600">{message}</p>
      )}
    </form>
  );
}