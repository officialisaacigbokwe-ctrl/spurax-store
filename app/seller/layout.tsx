"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import AdminButton from "@/components/AdminButton";

const navigation = [
  { label: "Dashboard", href: "/seller" },
  { label: "Products", href: "/seller/products" },
  { label: "Orders", href: "/seller/orders" },
  { label: "Delivery", href: "/seller/delivery" },
  { label: "Payments", href: "/seller/payments" },
  { label: "Verification", href: "/seller/verification" },
  { label: "Store", href: "/seller/store" },
  { label: "Settings", href: "/seller/settings" },
];

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = String(usePathname());

  function isActive(href: string) {
    return href === "/seller"
      ? pathname === "/seller"
      : pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* PHONE AND TABLET: slim top bar with swipeable tabs */}
        <div className="sticky top-0 z-40 border-b border-black/10 bg-white lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <BrandLogo size={30} showSublabel={false} />

            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              Seller Center
            </span>
          </div>

          <nav
            aria-label="Seller menu"
            className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive(item.href)
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {item.label}
              </Link>
            ))}

            <Link
              href="/shop"
              className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Marketplace
            </Link>
                        <AdminButton variant="tab" />
          </nav>
        </div>

        {/* COMPUTER: sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-black/10 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <div className="border-b border-black/10 px-6 py-6">
            <BrandLogo />

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-gray-400">
              Seller Center
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              Manage
            </p>

            <div className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive(item.href)
                      ? "bg-black text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-black"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="border-t border-black/10 p-4">
            <div className="mb-2 px-1">
              <AdminButton variant="pill" />
            </div>

            <Link
              href="/shop"
              className="block rounded-2xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-black"
            >
              Back to Marketplace
            </Link>

            <Link
              href="/"
              className="mt-1 block rounded-2xl px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-black"
            >
              Home
            </Link>
          </div>
        </aside>

        {/* CONTENT */}
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}