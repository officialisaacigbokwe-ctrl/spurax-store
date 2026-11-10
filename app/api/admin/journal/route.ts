import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const CATEGORIES = ["sellers", "buyers", "stories", "updates"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// List of all articles, or one article when ?id= is given
export async function GET(request: Request) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return fail("Not allowed.", 403);
  }

  const admin = createAdminClient();
  const id = new URL(request.url).searchParams.get("id");

  if (id) {
    const { data } = await admin
      .from("articles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!data) {
      return fail("Article not found.", 404);
    }

    return NextResponse.json({ article: data });
  }

  const { data, error } = await admin
    .from("articles")
    .select("id, slug, title, category, status, published_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return fail("Could not load articles.", 500);
  }

  return NextResponse.json({ items: data ?? [] });
}

// Create or update
export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return fail("Not allowed.", 403);
    }

    const admin = createAdminClient();
    const body = await request.json().catch(() => null);

    const id = text(body?.id, 80);
    const title = text(body?.title, 200);
    const slug = text(body?.slug, 100).toLowerCase();
    const excerpt = text(body?.excerpt, 300);
    const content =
      typeof body?.body === "string" ? body.body.slice(0, 50000) : "";
    const category = text(body?.category, 20);
    const authorName = text(body?.authorName, 80) || "Spurax Team";
    const status = body?.status === "published" ? "published" : "draft";

    const coverRaw = text(body?.coverUrl, 500);
    const coverUrl =
      coverRaw && /^https:\/\//i.test(coverRaw) ? coverRaw : null;

    const tags: string[] = Array.isArray(body?.tags)
      ? [
          ...new Set(
            (body.tags as unknown[])
              .map((tag) => text(tag, 30).toLowerCase())
              .filter(Boolean)
          ),
        ].slice(0, 8)
      : [];

    if (!title) {
      return fail("Please add a title.");
    }

    if (slug.length < 3 || !SLUG.test(slug)) {
      return fail(
        "The web address (slug) must use only lowercase letters, numbers and hyphens."
      );
    }

    if (!CATEGORIES.includes(category)) {
      return fail("Choose a category.");
    }

    if (status === "published" && (excerpt.length < 20 || content.length < 50)) {
      return fail(
        "To publish, add a short summary (at least 20 characters) and the article text."
      );
    }

    const now = new Date().toISOString();

    const fields = {
      slug,
      title,
      excerpt,
      body: content,
      cover_url: coverUrl,
      category,
      tags,
      author_name: authorName,
      status,
      updated_at: now,
    };

    if (id) {
      const { data: existing } = await admin
        .from("articles")
        .select("id, published_at")
        .eq("id", id)
        .maybeSingle();

      if (!existing) {
        return fail("Article not found.", 404);
      }

      // The first time an article is published, stamp the date.
      const publishedAt =
        status === "published"
          ? existing.published_at || now
          : existing.published_at;

      const { error } = await admin
        .from("articles")
        .update({ ...fields, published_at: publishedAt })
        .eq("id", id);

      if (error) {
        return error.code === "23505"
          ? fail("That web address (slug) is already used by another article.")
          : fail("Could not save the article.", 500);
      }

      return NextResponse.json({ id });
    }

    const { data, error } = await admin
      .from("articles")
      .insert({
        ...fields,
        published_at: status === "published" ? now : null,
        created_by: adminUser.id,
      })
      .select("id")
      .single();

    if (error || !data) {
      return error?.code === "23505"
        ? fail("That web address (slug) is already used by another article.")
        : fail("Could not save the article.", 500);
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("Journal save error:", error);
    return fail("Something went wrong.", 500);
  }
}

export async function DELETE(request: Request) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return fail("Not allowed.", 403);
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return fail("Missing article.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("articles").delete().eq("id", id);

  if (error) {
    return fail("Could not delete the article.", 500);
  }

  return NextResponse.json({ ok: true });
}