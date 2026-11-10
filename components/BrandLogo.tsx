import Link from "next/link";
import { BRAND } from "@/lib/brand";

// Icon + wordmark. Use variant="light" on dark backgrounds.
export default function BrandLogo({
  variant = "dark",
  size = 36,
  href = "/",
  showSublabel = true,
  className = "",
}: {
  variant?: "dark" | "light";
  size?: number;
  href?: string;
  showSublabel?: boolean;
  className?: string;
}) {
  const light = variant === "light";

  return (
    <Link
      href={href}
      aria-label={BRAND.name}
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <img
        src={BRAND.iconPath}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={`shrink-0 object-contain ${
          light ? "rounded-full bg-white" : ""
        }`}
      />

      <span className="flex flex-col leading-none">
        <span
          className={`text-lg font-bold tracking-[0.2em] ${
            light ? "text-white" : "text-black"
          }`}
        >
          {BRAND.wordmark}
        </span>

        {showSublabel && (
          <span
            className={`mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] ${
              light ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {BRAND.sublabel}
          </span>
        )}
      </span>
    </Link>
  );
}