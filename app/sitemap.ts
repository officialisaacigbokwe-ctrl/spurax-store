import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { siteUrl } from "@/lib/journal";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const supabase = createPublicClient();

  const [articles, stores, products] = await Promise.all([
    supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("status", "published")
      .limit(5000),
    supabase.from("stores").select("slug, updated_at").limit(5000),
    supabase.from("products").select("slug, updated_at").limit(5000),
  ]);

  const staticPages = [
    "",
    "/shop",
    "/journal",
    "/about",
    "/support",
    "/returns",
    "/terms",
    "/privacy",
    "/seller-agreement",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));

  return [
    ...staticPages,
    ...(articles.data ?? []).map((item) => ({
      url: `${base}/journal/${item.slug}`,
      lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
    })),
    ...(stores.data ?? []).map((item) => ({
      url: `${base}/store/${item.slug}`,
      lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
    })),
    ...(products.data ?? []).map((item) => ({
      url: `${base}/shop/${item.slug}`,
      lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
    })),
  ];
}