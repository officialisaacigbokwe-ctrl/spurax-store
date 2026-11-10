import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/journal";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/seller",
          "/admin",
          "/api",
          "/account",
          "/addresses",
          "/edit-profile",
          "/settings",
          "/cart",
          "/checkout",
          "/orders",
          "/auth",
          "/reset-password",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}