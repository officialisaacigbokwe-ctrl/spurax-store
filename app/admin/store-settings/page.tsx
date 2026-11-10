"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getActiveStoreId, setActiveStoreId } from "@/lib/store-context";

const BUCKET = "store-assets";

type Store = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
  default_currency: string | null;
  default_language: string | null;
};

// Works out the file path inside the bucket from a public image link.
function storagePathFromUrl(url: string | null | undefined) {
  if (!url) return null;

  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);

  if (index === -1) return null;

  const path = decodeURIComponent(
    url.slice(index + marker.length).split("?")[0]
  );

  return path || null;
}

export default function StoreSettingsPage() {
  const supabase = createClient();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [removing, setRemoving] = useState<"logo" | "banner" | null>(null);
  const [message, setMessage] = useState("");
  const [imageMessage, setImageMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    logo_url: "",
    banner_url: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    instagram_url: "",
    facebook_url: "",
    tiktok_url: "",
    x_url: "",
    youtube_url: "",
    default_currency: "NGN",
    default_language: "en",
  });

  useEffect(() => {
    async function loadStore() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be signed in.");
        setLoading(false);
        return;
      }

      let activeStoreId = getActiveStoreId();

      if (activeStoreId) {
        const { data: membership } = await supabase
          .from("store_memberships")
          .select("store_id")
          .eq("user_id", user.id)
          .eq("store_id", activeStoreId)
          .maybeSingle();

        if (!membership) {
          activeStoreId = null;
        }
      }

      if (!activeStoreId) {
        const { data: firstMembership } = await supabase
          .from("store_memberships")
          .select("store_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const firstStoreId = firstMembership?.store_id;

        if (!firstStoreId) {
          setMessage("You need to create a store first.");
          setLoading(false);
          return;
        }

        activeStoreId = firstStoreId;
        setActiveStoreId(firstStoreId);
      }

      const { data, error } = await supabase
        .from("stores")
        .select(
          "id,name,slug,description,logo_url,banner_url,address,city,state,country,postal_code,contact_email,contact_phone,website_url,instagram_url,facebook_url,tiktok_url,x_url,youtube_url,default_currency,default_language"
        )
        .eq("id", activeStoreId)
        .single();

      if (error || !data) {
        setMessage(error?.message || "You have not created a store yet.");
        setLoading(false);
        return;
      }

      setStore(data);

      setForm({
        name: data.name ?? "",
        slug: data.slug ?? "",
        description: data.description ?? "",
        logo_url: data.logo_url ?? "",
        banner_url: data.banner_url ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        country: data.country ?? "",
        postal_code: data.postal_code ?? "",
        contact_email: data.contact_email ?? "",
        contact_phone: data.contact_phone ?? "",
        website_url: data.website_url ?? "",
        instagram_url: data.instagram_url ?? "",
        facebook_url: data.facebook_url ?? "",
        tiktok_url: data.tiktok_url ?? "",
        x_url: data.x_url ?? "",
        youtube_url: data.youtube_url ?? "",
        default_currency: data.default_currency ?? "NGN",
        default_language: data.default_language ?? "en",
      });

      setLoading(false);
    }

    loadStore();
  }, []);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // Deletes a stored image file. Never blocks the page if it fails.
  async function removeStoredFile(url: string | null | undefined) {
    if (!store) return;

    const path = storagePathFromUrl(url);

    // Only ever delete files inside this store's own folder
    if (!path || !path.startsWith(`${store.id}/`)) return;

    const { error } = await supabase.storage.from(BUCKET).remove([path]);

    if (error) {
      console.error("Could not delete old store image:", error.message);
    }
  }

  async function uploadStoreImage(file: File, type: "logo" | "banner") {
    if (!store) return;

    if (!file.type.startsWith("image/")) {
      setImageMessage("Please select an image file.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setImageMessage("Image must be 6MB or smaller.");
      return;
    }

    const field = type === "logo" ? "logo_url" : "banner_url";
    const previousUrl = form[field];

    if (type === "logo") {
      setUploadingLogo(true);
    } else {
      setUploadingBanner(true);
    }

    setImageMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${store.id}/${type}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      setImageMessage(uploadError.message);

      if (type === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingBanner(false);
      }

      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    const { data: updated, error: updateError } = await supabase
      .from("stores")
      .update({
        [field]: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id)
      .select("id");

    if (updateError || !updated || updated.length === 0) {
      setImageMessage(updateError?.message || "Could not save the image.");
    } else {
      setForm((current) => ({ ...current, [field]: publicUrl }));
      setStore((current) =>
        current ? { ...current, [field]: publicUrl } : current
      );

      // The new image is saved, so the old file is no longer needed.
      await removeStoredFile(previousUrl);

      setImageMessage(
        type === "logo"
          ? "Store logo uploaded successfully."
          : "Store banner uploaded successfully."
      );
    }

    if (type === "logo") {
      setUploadingLogo(false);
    } else {
      setUploadingBanner(false);
    }
  }

  async function removeImage(type: "logo" | "banner") {
    if (!store) return;

    const field = type === "logo" ? "logo_url" : "banner_url";
    const current = form[field];

    if (!current) return;

    const confirmed = window.confirm(
      `Remove your store ${type}? Customers will no longer see it.`
    );

    if (!confirmed) return;

    setRemoving(type);
    setImageMessage("");

    const { data, error } = await supabase
      .from("stores")
      .update({
        [field]: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id)
      .select("id");

    if (error || !data || data.length === 0) {
      setImageMessage(error?.message || "Could not remove the image.");
      setRemoving(null);
      return;
    }

    await removeStoredFile(current);

    setForm((existing) => ({ ...existing, [field]: "" }));
    setStore((existing) =>
      existing ? { ...existing, [field]: null } : existing
    );

    setImageMessage(`Store ${type} removed successfully.`);
    setRemoving(null);
  }

  async function saveStore() {
    if (!store) return;

    setSaving(true);
    setMessage("");

    const cleanSlug = form.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!form.name.trim()) {
      setMessage("Store name is required.");
      setSaving(false);
      return;
    }

    if (!cleanSlug) {
      setMessage("Please enter a valid store URL.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("stores")
      .update({
        name: form.name.trim(),
        slug: cleanSlug,
        description: form.description.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        postal_code: form.postal_code.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        website_url: form.website_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        facebook_url: form.facebook_url.trim() || null,
        tiktok_url: form.tiktok_url.trim() || null,
        x_url: form.x_url.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        default_currency: form.default_currency,
        default_language: form.default_language,
        updated_at: new Date().toISOString(),
      })
      .eq("id", store.id);

    if (error) {
      setMessage(
        error.code === "23505"
          ? "That store URL is already taken. Please choose another one."
          : error.message
      );
      setSaving(false);
      return;
    }

    setForm((current) => ({
      ...current,
      slug: cleanSlug,
    }));

    setStore((current) =>
      current ? { ...current, slug: cleanSlug } : current
    );

    setMessage("Store settings saved successfully.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fafafa] px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-gray-500">Loading store settings...</p>
        </div>
      </main>
    );
  }

  const initials = (form.name || "ST").slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[#fafafa] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            SPURAX MARKETPLACE
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Store settings
          </h1>

          <p className="mt-3 max-w-2xl text-gray-500">
            Build your public storefront, add your business information, and
            choose how your store appears across SPURAX.
          </p>
        </div>

        {!store && message && (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {message}
          </div>
        )}

        {store?.slug && (
          <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Public Store
                </p>

                <p className="mt-1 break-all text-sm font-medium text-gray-800">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/store/${store.slug}`
                    : `/store/${store.slug}`}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  This is the public link customers can use to view your store.
                </p>
              </div>

              <Link
                href={`/store/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Visit Store
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Store identity */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">Store identity</h2>

            <p className="mt-1 text-sm text-gray-500">
              The information customers will see when they visit your store.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Store name"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                placeholder="Your store name"
              />

              <Field
                label="Store URL"
                value={form.slug}
                onChange={(value) => updateField("slug", value)}
                placeholder="your-store-name"
              />

              <div className="md:col-span-2">
                <label className="text-sm font-medium">Store description</label>

                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  placeholder="Tell customers about your store..."
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                />
              </div>
            </div>
          </section>

          {/* Store header (banner + logo) */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">Store header</h2>

            <p className="mt-1 text-sm text-gray-500">
              This is how the top of your store looks to customers.
            </p>

                                   {/* Preview */}
            <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white pt-4">
              <div className="px-4">
                <div className="overflow-hidden rounded-3xl bg-black p-1.5">
                  {form.banner_url ? (
                    <img
                      src={form.banner_url}
                      alt="Store banner"
                      className="aspect-[4/1] w-full rounded-[1.125rem] object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/1] w-full items-center justify-center rounded-[1.125rem] bg-gradient-to-br from-neutral-800 to-neutral-600 text-sm text-neutral-400">
                      No banner
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 pb-6 sm:flex sm:items-start sm:gap-5 sm:px-6">
                <div className="-mt-9 ml-2 flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white shadow-md sm:-mt-12 sm:h-24 sm:w-24">
                  {form.logo_url ? (
                    <img
                      src={form.logo_url}
                      alt="Store logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="px-3 text-center text-sm font-bold tracking-wider">
                      {initials}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xl font-bold sm:pt-3">
                  {form.name || "Your store name"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Your banner always sits in a black frame, so it stands out even
              when the picture has a white background.
            </p>

            {/* Controls */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <ImageControls
                label="Banner"
                hasImage={Boolean(form.banner_url)}
                uploading={uploadingBanner}
                removing={removing === "banner"}
                                hint="Wide image with a 4:1 shape, about 1584 × 396 px. Keep the important part in the middle. JPG, PNG or WebP, up to 6MB."
                onPick={(file) => uploadStoreImage(file, "banner")}
                onRemove={() => removeImage("banner")}
              />

              <ImageControls
                label="Logo"
                hasImage={Boolean(form.logo_url)}
                uploading={uploadingLogo}
                removing={removing === "logo"}
                hint="Square image, at least 400 × 400 px. JPG, PNG or WebP, up to 6MB."
                onPick={(file) => uploadStoreImage(file, "logo")}
                onRemove={() => removeImage("logo")}
              />
            </div>

            {imageMessage && (
              <p
                className={`mt-4 text-sm ${
                  imageMessage.includes("successfully")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {imageMessage}
              </p>
            )}
          </section>

          {/* Location */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">Store location</h2>

            <p className="mt-1 text-sm text-gray-500">
              Help customers understand where your store operates.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field
                  label="Address"
                  value={form.address}
                  onChange={(value) => updateField("address", value)}
                  placeholder="Business or pickup address"
                />
              </div>

              <Field
                label="City"
                value={form.city}
                onChange={(value) => updateField("city", value)}
                placeholder="City"
              />

              <Field
                label="State / Province"
                value={form.state}
                onChange={(value) => updateField("state", value)}
                placeholder="State or province"
              />

              <Field
                label="Country"
                value={form.country}
                onChange={(value) => updateField("country", value)}
                placeholder="Country"
              />

              <Field
                label="Postal code"
                value={form.postal_code}
                onChange={(value) => updateField("postal_code", value)}
                placeholder="Postal code"
              />
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">Contact information</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Contact email"
                value={form.contact_email}
                onChange={(value) => updateField("contact_email", value)}
                placeholder="store@example.com"
                type="email"
              />

              <Field
                label="Contact phone"
                value={form.contact_phone}
                onChange={(value) => updateField("contact_phone", value)}
                placeholder="+234..."
                type="tel"
              />

              <div className="md:col-span-2">
                <Field
                  label="Website"
                  value={form.website_url}
                  onChange={(value) => updateField("website_url", value)}
                  placeholder="https://yourwebsite.com"
                  type="url"
                />
              </div>
            </div>
          </section>

          {/* Socials */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">Social links</h2>

            <p className="mt-1 text-sm text-gray-500">
              Add the platforms where customers can connect with your store.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Instagram"
                value={form.instagram_url}
                onChange={(value) => updateField("instagram_url", value)}
                placeholder="https://instagram.com/..."
              />

              <Field
                label="Facebook"
                value={form.facebook_url}
                onChange={(value) => updateField("facebook_url", value)}
                placeholder="https://facebook.com/..."
              />

              <Field
                label="TikTok"
                value={form.tiktok_url}
                onChange={(value) => updateField("tiktok_url", value)}
                placeholder="https://tiktok.com/@..."
              />

              <Field
                label="X"
                value={form.x_url}
                onChange={(value) => updateField("x_url", value)}
                placeholder="https://x.com/..."
              />

              <div className="md:col-span-2">
                <Field
                  label="YouTube"
                  value={form.youtube_url}
                  onChange={(value) => updateField("youtube_url", value)}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
          </section>

          {/* Regional settings */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8">
            <h2 className="text-xl font-semibold">Regional settings</h2>

            <p className="mt-1 text-sm text-gray-500">
              These settings prepare your store for the international SPURAX
              marketplace. For now, payments are in Nigerian Naira (NGN).
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Default currency</label>

                <select
                  value={form.default_currency}
                  onChange={(e) =>
                    updateField("default_currency", e.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                  <option value="GHS">GHS — Ghanaian Cedi</option>
                  <option value="KES">KES — Kenyan Shilling</option>
                  <option value="ZAR">ZAR — South African Rand</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Default language</label>

                <select
                  value={form.default_language}
                  onChange={(e) =>
                    updateField("default_language", e.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="ar">Arabic</option>
                  <option value="zh">Chinese</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                </select>
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {store && message && (
                <p
                  className={`text-sm ${
                    message.includes("successfully")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={saveStore}
              disabled={saving || !store}
              className="rounded-full bg-black px-8 py-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save store settings"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
      />
    </div>
  );
}

function ImageControls({
  label,
  hasImage,
  uploading,
  removing,
  hint,
  onPick,
  onRemove,
}: {
  label: string;
  hasImage: boolean;
  uploading: boolean;
  removing: boolean;
  hint: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="inline-flex cursor-pointer rounded-full border border-black px-5 py-2.5 text-sm font-medium transition hover:bg-black hover:text-white">
          {uploading
            ? "Uploading..."
            : hasImage
              ? `Replace ${label.toLowerCase()}`
              : `Choose ${label.toLowerCase()}`}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading || removing}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                onPick(file);
              }

              e.target.value = "";
            }}
          />
        </label>

        {hasImage && (
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading || removing}
            className="rounded-full border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {removing ? "Removing..." : "Remove"}
          </button>
        )}
      </div>

      <p className="mt-2 text-xs leading-5 text-gray-400">{hint}</p>
    </div>
  );
}