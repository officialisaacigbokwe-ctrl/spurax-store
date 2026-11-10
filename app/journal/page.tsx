import Link from "next/link";
import type { Metadata } from "next";
import BrandLogo from "@/components/BrandLogo";
import ArticleCard from "@/components/ArticleCard";
import { BRAND } from "@/lib/brand";
import { CATEGORIES, getPublishedArticles, siteUrl } from "@/lib/journal";

export const metadata: Metadata = {
  title: `Journal | ${BRAND.name}`,
  description:
    "Guides, stories and updates for sellers and buyers on Spurax Global Marketplace.",
  alternates: { canonical: `${siteUrl()}/journal` },
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;

  const active = CATEGORIES.some((item) => item.key === category)
    ? category
    : undefined;

  const articles = await getPublishedArticles(active);

  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo />

          <Link
            href="/shop"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            Marketplace
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
          Journal
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
          Guides, stories and updates
        </h1>

        <p className="mt-4 max-w-2xl text-gray-500">
          Practical help for sellers and buyers, and the story behind{" "}
          {BRAND.name}.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/journal"
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              !active
                ? "border-black bg-black text-white"
                : "border-gray-200 hover:border-black"
            }`}
          >
            All
          </Link>

          {CATEGORIES.map((item) => (
            <Link
              key={item.key}
              href={`/journal?category=${item.key}`}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                active === item.key
                  ? "border-black bg-black text-white"
                  : "border-gray-200 hover:border-black"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {articles.length === 0 ? (
          <div className="mt-12 rounded-3xl bg-[#f3f3f3] px-6 py-20 text-center">
            <h2 className="text-2xl font-semibold">Nothing here yet</h2>

            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">
              We are writing more. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}