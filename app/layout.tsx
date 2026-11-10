import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import { BRAND } from "@/lib/brand";
import AnnouncementBar from "@/components/AnnouncementBar";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description:
    "Spurax Global Marketplace is an online marketplace where you can buy from independent sellers and open your own store.",
  applicationName: BRAND.name,

  icons: {
    icon: "/favicon.png",
    apple: "/apple-icon.png",
  },

  keywords: [
    "Spurax",
    "Spurax Global Marketplace",
    "marketplace",
    "online store",
    "sell online",
    "Nigeria",
  ],

  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.shortName,
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${poppins.variable} antialiased`}>
        <AnnouncementBar />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}