"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Markdown from "@/components/Markdown";

type Item = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

const CATEGORIES = [
  { key: "sellers", label: "Sellers" },
  { key: "buyers", label: "Buyers" },
  { key: "stories", label: "Stories" },
  { key: "updates", label: "Updates" },
];

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

const inputClass =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black";

export default function AdminJournalPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Editor
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("sellers");
  const [tags, setTags] = useState("");
  const [author, setAuthor] = useState("Spurax Team");
  const [coverUrl, setCoverUrl] = useState("");
  const [body, setBody] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadList() {
    setLoading(true);

    const response = await fetch("/api/admin/journal");

    if (response.status === 403) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Could not load articles.");
    } else {
      setItems(result.items ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadList();
  }, []);

  function startNew() {
    setEditing(true);
    setId(null);
    setStatus("draft");
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setExcerpt("");
    setCategory("sellers");
    setTags("");
    setAuthor("Spurax Team");
    setCoverUrl("");
    setBody("");
    setTab("write");
    setError("");
    setNotice("");
  }

  async function openArticle(articleId: string) {
    setError("");
    setNotice("");

    const response = await fetch(`/api/admin/journal?id=${articleId}`);
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Could not open this article.");
      return;
    }

    const article = result.article;

    setEditing(true);
    setId(article.id);
    setStatus(article.status);
    setTitle(article.title);
    setSlug(article.slug);
    setSlugTouched(true);
    setExcerpt(article.excerpt || "");
    setCategory(article.category);
    setTags((article.tags || []).join(", "));
    setAuthor(article.author_name || "Spurax Team");
    setCoverUrl(article.cover_url || "");
    setBody(article.body || "");
    setTab("write");
  }

  function onTitleChange(value: string) {
    setTitle(value);

    if (!slugTouched) {
      setSlug(makeSlug(value));
    }
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setError("");

    const data = new FormData();
    data.append("file", file);

    const response = await fetch("/api/admin/journal/upload", {
      method: "POST",
      body: data,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Could not upload the image.");
    } else {
      setCoverUrl(result.url);
    }

    setUploading(false);
  }

  async function save(nextStatus: "draft" | "published") {
    setError("");
    setNotice("");
    setSaving(true);

    const response = await fetch("/api/admin/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: id || undefined,
        title,
        slug,
        excerpt,
        body,
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        authorName: author,
        coverUrl,
        status: nextStatus,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setError(result?.error || "Could not save.");
      setSaving(false);
      return;
    }

    setId(result.id);
    setStatus(nextStatus);
    setNotice(
      nextStatus === "published"
        ? "Saved and published. It is now live in the Journal."
        : "Saved as a draft. Only admins can see it."
    );

    await loadList();
    setSaving(false);
  }

  async function remove() {
    if (!id) return;

    if (!window.confirm("Delete this article for good? This cannot be undone.")) {
      return;
    }

    const response = await fetch(`/api/admin/journal?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("Could not delete the article.");
      return;
    }

    setEditing(false);
    setId(null);
    setNotice("Article deleted.");
    await loadList();
  }

  function formatDate(date: string | null) {
    if (!date) return "Not published";

    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] px-6 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Not allowed</h1>

          <p className="mt-3 text-sm text-gray-500">
            This page is for Spurax admins only. Sign in with an admin account.
          </p>

          <Link
            href="/sign-in?next=/admin/journal"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
              SPURAX ADMIN
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight">Journal</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/verifications"
              className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-semibold transition hover:border-black"
            >
              Verifications
            </Link>

            <button
              type="button"
              onClick={startNew}
              className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              + New article
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {notice}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* LIST */}
          <section className="space-y-3">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : items.length === 0 ? (
              <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
                No articles yet.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openArticle(item.id)}
                  className={`block w-full rounded-3xl border bg-white p-5 text-left transition hover:border-black ${
                    id === item.id ? "border-black" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        item.status === "published"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {item.status}
                    </span>

                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      {item.category}
                    </span>
                  </div>

                  <p className="mt-2 font-semibold leading-snug">{item.title}</p>

                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(item.published_at)}
                  </p>
                </button>
              ))
            )}
          </section>

          {/* EDITOR */}
          <section>
            {!editing ? (
              <div className="rounded-3xl bg-white p-8 text-sm text-gray-500 shadow-sm">
                Choose an article on the left to edit it, or press{" "}
                <span className="font-semibold text-black">+ New article</span>.
              </div>
            ) : (
              <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Title</label>
                    <input
                      value={title}
                      onChange={(event) => onTitleChange(event.target.value)}
                      placeholder="How to open your store"
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">
                      Web address (slug)
                    </label>
                    <input
                      value={slug}
                      onChange={(event) => {
                        setSlug(makeSlug(event.target.value));
                        setSlugTouched(true);
                      }}
                      placeholder="how-to-open-your-store"
                      className={inputClass}
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      The article will live at /journal/{slug || "your-slug"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">
                      Short summary ({excerpt.length}/300)
                    </label>
                    <textarea
                      value={excerpt}
                      onChange={(event) =>
                        setExcerpt(event.target.value.slice(0, 300))
                      }
                      rows={3}
                      placeholder="One or two sentences. Shown on cards and in search results."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className={inputClass}
                    >
                      {CATEGORIES.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Author name</label>
                    <input
                      value={author}
                      onChange={(event) => setAuthor(event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">
                      Tags (separate with commas)
                    </label>
                    <input
                      value={tags}
                      onChange={(event) => setTags(event.target.value)}
                      placeholder="store, payments"
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Cover image</label>

                    {coverUrl && (
                      <img
                        src={coverUrl}
                        alt="Cover"
                        className="mt-3 max-h-48 rounded-2xl border border-gray-200 object-cover"
                      />
                    )}

                    <div className="mt-3 flex flex-wrap gap-3">
                      <label className="inline-flex cursor-pointer rounded-full border border-black px-5 py-2.5 text-sm font-medium transition hover:bg-black hover:text-white">
                        {uploading
                          ? "Uploading..."
                          : coverUrl
                            ? "Replace image"
                            : "Choose image"}

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={uploading}
                          onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                              uploadCover(file);
                            }

                            event.target.value = "";
                          }}
                        />
                      </label>

                      {coverUrl && (
                        <button
                          type="button"
                          onClick={() => setCoverUrl("")}
                          className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-gray-400">
                      JPG, PNG or WebP, up to 5 MB. A wide picture works best.
                    </p>
                  </div>
                </div>

                {/* BODY */}
                <div className="mt-8">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Article text</p>

                    <div className="flex gap-2">
                      {(["write", "preview"] as const).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setTab(item)}
                          className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition ${
                            tab === item
                              ? "border-black bg-black text-white"
                              : "border-gray-200 hover:border-black"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tab === "write" ? (
                    <>
                      <textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        rows={20}
                        placeholder="Write your article here..."
                        className="mt-3 w-full rounded-2xl border border-gray-200 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-black"
                      />

                      <details className="mt-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                        <summary className="cursor-pointer font-medium text-black">
                          Formatting help
                        </summary>

                        <ul className="mt-3 space-y-1 font-mono text-xs">
                          <li>## A big heading</li>
                          <li>### A smaller heading</li>
                          <li>- A bullet point</li>
                          <li>1. A numbered step</li>
                          <li>**bold text** and *italic text*</li>
                          <li>[link text](/shop) or [link](https://example.com)</li>
                          <li>&gt; A quote</li>
                          <li>--- a divider line</li>
                        </ul>

                        <p className="mt-3 text-xs">
                          Leave a blank line between paragraphs.
                        </p>
                      </details>
                    </>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-gray-200 p-6">
                      <h2 className="text-3xl font-bold">
                        {title || "Untitled"}
                      </h2>

                      {excerpt && (
                        <p className="mt-3 text-gray-500">{excerpt}</p>
                      )}

                      <div className="mt-6">
                        <Markdown source={body || "Nothing to preview yet."} />
                      </div>
                    </div>
                  )}
                </div>

                {/* ACTIONS */}
                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                  {status === "published" ? (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => save("published")}
                        className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save changes"}
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => save("draft")}
                        className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold transition hover:border-black disabled:opacity-50"
                      >
                        Unpublish
                      </button>

                      {slug && (
                        <Link
                          href={`/journal/${slug}`}
                          target="_blank"
                          className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:border-black"
                        >
                          View live
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => save("draft")}
                        className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold transition hover:border-black disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save draft"}
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => save("published")}
                        className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                      >
                        Publish
                      </button>
                    </>
                  )}

                  {id && (
                    <button
                      type="button"
                      onClick={remove}
                      className="ml-auto rounded-full border border-red-300 px-6 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}