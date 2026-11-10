import { createPublicClient } from "@/lib/supabase/public";

export type CategoryKey = "sellers" | "buyers" | "stories" | "updates";

export const CATEGORIES: { key: CategoryKey; label: string; blurb: string }[] = [
  {
    key: "sellers",
    label: "Sellers",
    blurb: "Guides for opening and running a store.",
  },
  {
    key: "buyers",
    label: "Buyers",
    blurb: "Tips for shopping with confidence.",
  },
  {
    key: "stories",
    label: "Stories",
    blurb: "The people and ideas behind Spurax.",
  },
  {
    key: "updates",
    label: "Updates",
    blurb: "News and what is new on the marketplace.",
  },
];

export type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  cover_url: string | null;
  category: CategoryKey;
  tags: string[];
  author_name: string;
  published_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, slug, title, excerpt, body, cover_url, category, tags, author_name, published_at, updated_at";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function categoryLabel(key: string) {
  return CATEGORIES.find((category) => category.key === key)?.label ?? key;
}

export function readingMinutes(body: string) {
  const words = body.trim().split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function getPublishedArticles(
  category?: string,
  limit = 60
): Promise<Article[]> {
  const supabase = createPublicClient();

  let query = supabase
    .from("articles")
    .select(COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (category && CATEGORIES.some((item) => item.key === category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Journal list error:", error.message);
    return [];
  }

  return (data ?? []) as Article[];
}

export async function getArticle(slug: string): Promise<Article | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("articles")
    .select(COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("Journal article error:", error.message);
    return null;
  }

  return (data as Article | null) ?? null;
}

// "Read more": same category first, then the newest others.
export async function getRelatedArticles(
  article: Article,
  limit = 3
): Promise<Article[]> {
  const supabase = createPublicClient();

  const { data: same } = await supabase
    .from("articles")
    .select(COLUMNS)
    .eq("status", "published")
    .eq("category", article.category)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(limit);

  const related = (same ?? []) as Article[];

  if (related.length >= limit) {
    return related;
  }

  const { data: more } = await supabase
    .from("articles")
    .select(COLUMNS)
    .eq("status", "published")
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(limit + related.length + 3);

  const seen = new Set(related.map((item) => item.id));

  for (const item of (more ?? []) as Article[]) {
    if (related.length >= limit) break;

    if (!seen.has(item.id)) {
      related.push(item);
      seen.add(item.id);
    }
  }

  return related;
}