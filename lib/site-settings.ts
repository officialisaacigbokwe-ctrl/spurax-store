"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SiteSettings = {
  announcement: { enabled: boolean; text: string; link: string };
  ad_board: { enabled: boolean; image_url: string; link: string; alt: string };
  socials: {
    instagram: string;
    x: string;
    tiktok: string;
    linkedin: string;
    youtube: string;
    facebook: string;
  };
  company_links: { spurax: string; litmark: string; isaacdev: string };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  announcement: { enabled: false, text: "", link: "" },
  ad_board: { enabled: false, image_url: "", link: "", alt: "" },
  socials: {
    instagram: "",
    x: "",
    tiktok: "",
    linkedin: "",
    youtube: "",
    facebook: "",
  },
  company_links: { spurax: "", litmark: "", isaacdev: "" },
};

async function fetchSettings(): Promise<SiteSettings> {
  const supabase = createClient();
  const { data } = await supabase.from("site_settings").select("key, value");

  const merged = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as SiteSettings;

  for (const row of data ?? []) {
    if (row.key in merged && row.value && typeof row.value === "object") {
      (merged as any)[row.key] = {
        ...(merged as any)[row.key],
        ...row.value,
      };
    }
  }

  return merged;
}

// One shared request per minute, so every part of a page reuses it.
let cache: { at: number; promise: Promise<SiteSettings> } | null = null;

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;

    if (!cache || Date.now() - cache.at > 60000) {
      cache = { at: Date.now(), promise: fetchSettings() };
    }

    cache.promise
      .then((value) => {
        if (active) setSettings(value);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return settings;
}