"use client";

import { createContext, ReactNode, useContext } from "react";
import { brand } from "@/config/brand";
import type { PublicSiteSettings } from "@/lib/siteSeo";
import { DEFAULT_DELIVERY } from "@/lib/storeConfig";

const fallback: PublicSiteSettings = {
  storeName: brand.name,
  siteLogoUrl: "",
  themeColor: "#0a0a0a",
  supportPhone: "",
  supportEmail: brand.emails.support,
  ...DEFAULT_DELIVERY,
  social: {
    facebook: brand.social.facebook,
    instagram: brand.social.instagram,
    twitter: brand.social.twitter,
    youtube: brand.social.youtube,
    linkedin: brand.social.linkedin,
    tiktok: "",
  },
};

const SiteSettingsContext = createContext<PublicSiteSettings>(fallback);

/** Store name, logo and social links from Admin → SEO & Branding */
export function SiteSettingsProvider({
  value,
  children,
}: {
  value: PublicSiteSettings;
  children: ReactNode;
}) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
