import Link from "next/link";
import {
  Article,
  categoryLabel,
  formatDate,
  readingMinutes,
} from "@/lib/journal";

export default function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/journal/${article.slug}`} className="group block">
      <div className="overflow-hidden rounded-3xl bg-[#f3f3f3]">
        {article.cover_url ? (
          <img
            src={article.cover_url}
            alt={article.title}
            className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-[16/10] items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-400">
              {categoryLabel(article.category)}
            </span>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
        {categoryLabel(article.category)}
      </p>

      <h3 className="mt-2 text-lg font-semibold leading-snug transition group-hover:opacity-60">
        {article.title}
      </h3>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-500">
        {article.excerpt}
      </p>

      <p className="mt-3 text-xs text-gray-400">
        {formatDate(article.published_at)} · {readingMinutes(article.body)} min
        read
      </p>
    </Link>
  );
}