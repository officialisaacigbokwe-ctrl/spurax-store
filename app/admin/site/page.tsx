"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_SETTINGS, SiteSettings } from "@/lib/site-settings";

type Notice = { key: string; ok: boolean; text: string } | null;

const inputClass =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black";

function Card({
  title,
  help,
  onSave,
  saving,
  notice,
  noticeKey,
  children,
}: {
  title: string;
  help: string;
  onSave: () => void;
  saving: boolean;
  notice: Notice;
  noticeKey: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{help}</p>

      <div className="mt-6 space-y-5">{children}</div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        {notice && notice.key === noticeKey && (
          <p className={`text-sm ${notice.ok ? "text-green-600" : "text-red-600"}`}>
            {notice.text}
          </p>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export default function AdminSitePage() {
  const [draft, setDraft] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/admin/site-settings");

      if (response.status === 403) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const result = await response.json().catch(() => null);
      const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as SiteSettings;

      for (const [key, value] of Object.entries(result?.rows ?? {})) {
        if (key in merged && value && typeof value === "object") {
          (merged as any)[key] = { ...(merged as any)[key], ...(value as object) };
        }
      }

      setDraft(merged);
      setLoading(false);
    }

    load();
  }, []);

  function update(key: keyof SiteSettings, field: string, value: string | boolean) {
    setDraft(
      (current) =>
        ({
          ...current,
          [key]: { ...(current[key] as object), [field]: value },
        }) as SiteSettings
    );
  }

  async function save(key: keyof SiteSettings) {
    setSaving(key);
    setNotice(null);

    const response = await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: draft[key] }),
    });

    const result = await response.json().catch(() => null);

    setNotice(
      response.ok
        ? { key, ok: true, text: "Saved. It is live now." }
        : { key, ok: false, text: result?.error || "Could not save." }
    );

    setSaving(null);
  }

  async function uploadAd(file: File) {
    setUploading(true);
    setNotice(null);

    const data = new FormData();
    data.append("file", file);

    const response = await fetch("/api/admin/site-upload", {
      method: "POST",
      body: data,
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      setNotice({ key: "ad_board", ok: false, text: result?.error || "Upload failed." });
    } else {
      update("ad_board", "image_url", result.url);
    }

    setUploading(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f7]">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
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
            href="/sign-in?next=/admin/site"
            className="mt-6 inline-flex rounded-full bg-black px-6 py-3 text-sm font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const { announcement, ad_board: ad, socials, company_links: links } = draft;

  return (
    <main className="min-h-screen bg-[#f7f7f7]">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href="/admin"
          className="text-sm font-medium text-gray-500 hover:text-black"
        >
          ← Admin panel
        </Link>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          SPURAX ADMIN
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">Site content</h1>

        <p className="mt-2 text-gray-500">
          Manage the announcement, the ad board, your social links and the
          footer links. Changes go live within a minute.
        </p>

        <div className="mt-8 space-y-6">
          {/* ANNOUNCEMENT */}
          <Card
            title="Announcement bar"
            help="A slim black bar at the very top of public pages."
            onSave={() => save("announcement")}
            saving={saving === "announcement"}
            notice={notice}
            noticeKey="announcement"
          >
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={announcement.enabled}
                onChange={(event) =>
                  update("announcement", "enabled", event.target.checked)
                }
                className="h-4 w-4"
              />
              Show the announcement
            </label>

            <Field
              label={`Text (${announcement.text.length}/160)`}
              value={announcement.text}
              onChange={(value) => update("announcement", "text", value)}
              placeholder="Free delivery on orders above ₦50,000 this week"
            />

            <Field
              label="Link (optional)"
              value={announcement.link}
              onChange={(value) => update("announcement", "link", value)}
              placeholder="/shop or https://..."
            />

            {announcement.text && (
              <div className="rounded-xl bg-black px-4 py-2.5 text-center text-xs text-white">
                {announcement.text}
                {announcement.link && (
                  <span className="ml-2 underline">Learn more →</span>
                )}
              </div>
            )}
          </Card>

          {/* AD BOARD */}
          <Card
            title="Ad board"
            help="A slim rectangle under the home page header, marked with a small “Ad” label. Use a wide picture about 1500 × 250 pixels (6 to 1) and keep the important part in the middle."
            onSave={() => save("ad_board")}
            saving={saving === "ad_board"}
            notice={notice}
            noticeKey="ad_board"
          >
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={ad.enabled}
                onChange={(event) => update("ad_board", "enabled", event.target.checked)}
                className="h-4 w-4"
              />
              Show the ad board
            </label>

            {ad.image_url && (
              <img
                src={ad.image_url}
                alt="Ad preview"
                className="aspect-[6/1] w-full rounded-2xl border border-gray-200 object-cover"
              />
            )}

            <div className="flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer rounded-full border border-black px-5 py-2.5 text-sm font-medium transition hover:bg-black hover:text-white">
                {uploading ? "Uploading..." : ad.image_url ? "Replace picture" : "Choose picture"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) uploadAd(file);

                    event.target.value = "";
                  }}
                />
              </label>

              {ad.image_url && (
                <button
                  type="button"
                  onClick={() => update("ad_board", "image_url", "")}
                  className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Remove picture
                </button>
              )}
            </div>

            <Field
              label="Where it goes when tapped (optional)"
              value={ad.link}
              onChange={(value) => update("ad_board", "link", value)}
              placeholder="https://... or /shop"
            />

            <Field
              label="Short description of the picture"
              value={ad.alt}
              onChange={(value) => update("ad_board", "alt", value)}
              placeholder="For example: Amaka Glow, new skincare range"
            />
          </Card>

          {/* SOCIALS */}
          <Card
            title="Social links"
            help="Shown as icons in the footer. Leave one empty to hide it. Paste the full address, starting with https://"
            onSave={() => save("socials")}
            saving={saving === "socials"}
            notice={notice}
            noticeKey="socials"
          >
            {(
              [
                ["instagram", "Instagram"],
                ["x", "X"],
                ["tiktok", "TikTok"],
                ["linkedin", "LinkedIn"],
                ["youtube", "YouTube"],
                ["facebook", "Facebook"],
              ] as const
            ).map(([name, label]) => (
              <Field
                key={name}
                label={label}
                value={socials[name]}
                onChange={(value) => update("socials", name, value)}
                placeholder="https://..."
              />
            ))}
          </Card>

          {/* COMPANY LINKS */}
          <Card
            title="Footer company links"
            help="The web addresses behind the names in the footer's Company list."
            onSave={() => save("company_links")}
            saving={saving === "company_links"}
            notice={notice}
            noticeKey="company_links"
          >
            <Field
              label="Spurax"
              value={links.spurax}
              onChange={(value) => update("company_links", "spurax", value)}
              placeholder="https://..."
            />

            <Field
              label="Litmark Holdings"
              value={links.litmark}
              onChange={(value) => update("company_links", "litmark", value)}
              placeholder="https://..."
            />

            <Field
              label="IsaacDev"
              value={links.isaacdev}
              onChange={(value) => update("company_links", "isaacdev", value)}
              placeholder="https://..."
            />
          </Card>
        </div>
      </div>
    </main>
  );
}