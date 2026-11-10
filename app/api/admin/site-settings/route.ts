import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const SOCIAL_KEYS = ["instagram", "x", "tiktok", "linkedin", "youtube", "facebook"];
const COMPANY_KEYS = ["spurax", "litmark", "isaacdev"];

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Empty is fine. Otherwise it must be an https address,
// or (when allowed) a page on this site such as /shop.
function cleanUrl(value: unknown, allowRelative = false): string | null {
  const text = typeof value === "string" ? value.trim() : "";

  if (text === "") return "";
  if (text.length > 300) return null;
  if (allowRelative && /^\/(?!\/)[^\s]*$/.test(text)) return text;

  return /^https:\/\/[^\s]+$/i.test(text) ? text : null;
}

export async function GET() {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return fail("Not allowed.", 403);
  }

  const admin = createAdminClient();
  const { data } = await admin.from("site_settings").select("key, value");

  const rows: Record<string, unknown> = {};

  for (const row of data ?? []) {
    rows[row.key] = row.value;
  }

  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return fail("Not allowed.", 403);
    }

    const body = await request.json().catch(() => null);
    const key = typeof body?.key === "string" ? body.key : "";
    const value = (body?.value ?? {}) as Record<string, unknown>;

    let clean: Record<string, unknown> | null = null;

    if (key === "announcement") {
      const text = cleanText(value.text, 160);
      const link = cleanUrl(value.link, true);
      const enabled = value.enabled === true;

      if (link === null) {
        return fail(
          "The link must start with https:// or be a page on this site, like /shop."
        );
      }

      if (enabled && !text) {
        return fail("Write the announcement text before turning it on.");
      }

      clean = { enabled, text, link };
    } else if (key === "ad_board") {
      const imageUrl = cleanUrl(value.image_url);
      const link = cleanUrl(value.link, true);
      const enabled = value.enabled === true;

      if (imageUrl === null || link === null) {
        return fail(
          "Addresses must start with https:// (the link can also be a page on this site, like /shop)."
        );
      }

      if (enabled && !imageUrl) {
        return fail("Upload a picture before turning the ad on.");
      }

      clean = { enabled, image_url: imageUrl, link, alt: cleanText(value.alt, 120) };
    } else if (key === "socials" || key === "company_links") {
      const keys = key === "socials" ? SOCIAL_KEYS : COMPANY_KEYS;
      const result: Record<string, string> = {};

      for (const name of keys) {
        const url = cleanUrl(value[name]);

        if (url === null) {
          return fail(`The ${name} address must start with https://`);
        }

        result[name] = url;
      }

      clean = result;
    } else {
      return fail("Unknown setting.");
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("site_settings")
      .upsert(
        { key, value: clean, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) {
      console.error("Site settings error:", error.message);
      return fail("Could not save.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Site settings error:", error);
    return fail("Something went wrong.", 500);
  }
}