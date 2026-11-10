"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY } from "@/lib/company";
import { BRAND } from "@/lib/brand";
import { useSiteSettings } from "@/lib/site-settings";
import BrandLogo from "@/components/BrandLogo";
import AdminButton from "@/components/AdminButton";
import SocialIcon, { SocialName } from "@/components/SocialIcon";

// Pages where the footer would get in the way.
const HIDDEN_ON = [
  "/seller",
  "/admin",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/checkout",
  "/auth",
  "/create-store",
];

const SOCIAL_ORDER: { name: SocialName; label: string }[] = [
  { name: "instagram", label: "Instagram" },
  { name: "x", label: "X" },
  { name: "tiktok", label: "TikTok" },
  { name: "linkedin", label: "LinkedIn" },
  { name: "youtube", label: "YouTube" },
  { name: "facebook", label: "Facebook" },
];

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
      {children}
    </p>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="text-gray-400 transition hover:text-white">
        {label}
      </Link>
    </li>
  );
}

// A link to another company's website. Plain text until a link is set.
function GroupLink({ url, label }: { url: string; label: string }) {
  return (
    <li>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 transition hover:text-white"
        >
          {label}
        </a>
      ) : (
        <span className="text-gray-500">{label}</span>
      )}
    </li>
  );
}

export default function SiteFooter() {
  const pathname = usePathname() || "/";
  const { socials, company_links: links } = useSiteSettings();

  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const icons = SOCIAL_ORDER.filter(
    (item) => (socials[item.name] || "").trim() !== ""
  );

  const year = new Date().getFullYear();

  const iconRow = (
    <div className="flex flex-wrap gap-3">
      {icons.map((item) => (
        <a
          key={item.name}
          href={socials[item.name]}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-gray-300 transition hover:bg-white hover:text-black"
        >
          <SocialIcon name={item.name} size={18} />
        </a>
      ))}
    </div>
  );

  // ---- Every page except the home page: a slim footer ----
  if (pathname !== "/") {
    return (
      <footer className="bg-black px-6 py-6 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-gray-400">
            © {year} {COMPANY.legalName}. {BRAND.name}.
          </p>

          {icons.length > 0 && iconRow}

          <div className="flex items-center gap-5">
            <Link
              href="/support"
              className="text-sm text-gray-300 transition hover:text-white"
            >
              Support
            </Link>

            <AdminButton variant="inline" />
          </div>
        </div>
      </footer>
    );
  }

  // ---- Home page: the full footer ----
  return (
    <footer className="bg-black px-6 py-14 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-1">
            <BrandLogo variant="light" size={40} />

            <p className="mt-4 max-w-xs text-sm leading-6 text-gray-400">
              {BRAND.tagline} A marketplace for independent sellers and the
              people who love their products.
            </p>

            {icons.length > 0 && (
              <div className="mt-6">
                <Heading>Follow us</Heading>
                <div className="mt-3">{iconRow}</div>
              </div>
            )}
          </div>

          <div>
            <Heading>Marketplace</Heading>

            <ul className="mt-4 space-y-3 text-sm">
              <FooterLink href="/shop" label="Shop all" />
              <FooterLink href="/create-store" label="Sell on Spurax" />
                            <FooterLink href="/founding-stores" label="Founding stores" />
              <FooterLink href="/journal" label="Journal" />
              <FooterLink href="/orders" label="My orders" />
            </ul>
          </div>

          <div>
            <Heading>Help</Heading>

            <ul className="mt-4 space-y-3 text-sm">
              <FooterLink href="/support" label="Support" />
              <FooterLink href="/returns" label="Returns and refunds" />
              <FooterLink href="/orders" label="Track an order" />
            </ul>
          </div>

          <div>
            <Heading>Company</Heading>

            <ul className="mt-4 space-y-3 text-sm">
              <FooterLink href="/about" label="About us" />
              <GroupLink url={links.spurax} label={BRAND.parentName} />
              <GroupLink
                url={links.litmark}
                label={COMPANY.parentCompany || "Litmark Holdings"}
              />
              <GroupLink url={links.isaacdev} label="Built by IsaacDev" />
              <AdminButton variant="link" />
            </ul>
          </div>

          <div>
            <Heading>Legal</Heading>

            <ul className="mt-4 space-y-3 text-sm">
              <FooterLink href="/terms" label="Terms of Service" />
              <FooterLink href="/privacy" label="Privacy Policy" />
              <FooterLink href="/seller-agreement" label="Seller Agreement" />
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {COMPANY.legalName}. All rights reserved.
          </p>

          <p>
            Products are sold by independent sellers. Delivery is handled by
            the seller.
          </p>
        </div>
      </div>
    </footer>
  );
}