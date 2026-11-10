import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BrandLogo from "@/components/BrandLogo";
import ArticleCard from "@/components/ArticleCard";
import Markdown from "@/components/Markdown";
import SocialIcon from "@/components/SocialIcon";
import { BRAND } from "@/lib/brand";
import {
  categoryLabel,
  formatDate,
  getArticle,
  getRelatedArticles,
  readingMinutes,
  siteUrl,
} from "@/lib/journal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: `Article not found | ${BRAND.name}` };
  }

  const url = `${siteUrl()}/journal/${article.slug}`;
  const title = `${article.title} | ${BRAND.name}`;

  return {
    title,
    description: article.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: article.excerpt,
      url,
      type: "article",
      publishedTime: article.published_at,
      authors: [article.author_name],
      images: article.cover_url ? [article.cover_url] : undefined,
    },
    twitter: {
      card: article.cover_url ? "summary_large_image" : "summary",
      title,
      description: article.excerpt,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const related = await getRelatedArticles(article, 3);

  const url = `${siteUrl()}/journal/${article.slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(article.title);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image: article.cover_url ? [article.cover_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Organization", name: article.author_name },
    publisher: { "@type": "Organization", name: BRAND.name },
    mainEntityOfPage: url,
  };

  const shareClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:border-black hover:bg-black hover:text-white";

  return (
    <main className="min-h-screen bg-white text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <BrandLogo />

          <Link
            href="/journal"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            ← All articles
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <Link
          href={`/journal?category=${article.category}`}
          className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400 hover:text-black"
        >
          {categoryLabel(article.category)}
        </Link>

        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          {article.title}
        </h1>

        <p className="mt-5 text-lg leading-8 text-gray-500">
          {article.excerpt}
        </p>

        <p className="mt-6 text-sm text-gray-400">
          By {article.author_name} · {formatDate(article.published_at)} ·{" "}
          {readingMinutes(article.body)} min read
        </p>

        {article.cover_url && (
          <img
            src={article.cover_url}
            alt={article.title}
            className="mt-10 w-full rounded-3xl object-cover"
          />
        )}

        <div className="mt-10">
          <Markdown source={article.body} />
        </div>

        {/* Share */}
        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
          <p className="mr-2 text-sm font-medium text-gray-500">Share</p>

          <a
            href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X"
            className={shareClass}
          >
            <SocialIcon name="x" size={18} />
          </a>

          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on LinkedIn"
            className={shareClass}
          >
            <SocialIcon name="linkedin" size={18} />
          </a>

          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
            className={shareClass}
          >
            <SocialIcon name="facebook" size={18} />
          </a>

          <a
            href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:border-black hover:bg-black hover:text-white"
          >
            WhatsApp
          </a>
        </div>
      </article>

      {/* Read more */}
      {related.length > 0 && (
        <section className="border-t border-gray-100 bg-[#fafafa] px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-2xl font-bold tracking-tight">Read more</h2>

            <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Call to action */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl bg-black p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-bold">Ready to get started?</h2>

          <p className="mt-3 text-sm text-gray-400">
            Shop from independent sellers, or open your own store on{" "}
            {BRAND.name}.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Start shopping
            </Link>

            <Link
              href="/create-store"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
            >
              Open a store
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}