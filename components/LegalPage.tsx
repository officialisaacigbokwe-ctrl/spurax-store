import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";
import type { ReactNode } from "react";
import { COMPANY } from "@/lib/company";

export default function LegalPage({
  title,
  intro,
  eyebrow = "Legal",
  children,
}: {
  title: string;
  intro?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <BrandLogo />

          <Link
            href="/shop"
            className="text-sm font-medium text-gray-600 transition hover:text-black"
          >
            Marketplace
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          {eyebrow}
        </p>

        <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>

        <p className="mt-3 text-sm text-gray-500">
          Last updated: {COMPANY.lastUpdated}
        </p>

        {intro && (
          <p className="mt-6 text-base leading-7 text-gray-600">{intro}</p>
        )}

        <div className="mt-10 space-y-10">{children}</div>
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="mt-3 space-y-3 text-[15px] leading-7 text-gray-600">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}