"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteSettings } from "@/lib/site-settings";

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

export default function AnnouncementBar() {
  const pathname = usePathname() || "/";
  const { announcement } = useSiteSettings();

  if (HIDDEN_ON.some((path) => pathname.startsWith(path))) return null;
  if (!announcement.enabled || !announcement.text.trim()) return null;

  const link = announcement.link.trim();
  const className =
    "block bg-black px-4 py-2.5 text-center text-xs font-medium text-white sm:text-sm";

  const content = (
    <span>
      {announcement.text}
      {link && (
        <span className="ml-2 underline underline-offset-4">Learn more →</span>
      )}
    </span>
  );

  if (!link) return <div className={className}>{content}</div>;

  if (link.startsWith("/")) {
    return (
      <Link href={link} className={`${className} hover:bg-gray-900`}>
        {content}
      </Link>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} hover:bg-gray-900`}
    >
      {content}
    </a>
  );
}