import "server-only";
import { cache } from "react";
import { getStoreSettings, type StoreSettings } from "@/lib/storeSettings";
import { brand } from "@/config/brand";

// Request-deduplicated settings read for metadata, layout, sitemap, etc.
export const getSiteSettings = cache(() => getStoreSettings());

export const defaultOgImage = (s: StoreSettings) => s.ogImageUrl || `${brand.url}/og`;

export const siteIcon = (s: StoreSettings) => s.faviconUrl || "/icon.svg";

export function socialProfiles(s: StoreSettings) {
  return {
    facebook: s.facebookUrl,
    instagram: s.instagramUrl,
    twitter: s.twitterUrl,
    youtube: s.youtubeUrl,
    linkedin: s.linkedinUrl,
    tiktok: s.tiktokUrl,
  };
}

/** Values safe to expose to the browser (no admin-only fields) */
export interface PublicSiteSettings {
  storeName: string;
  siteLogoUrl: string;
  themeColor: string;
  supportPhone: string;
  supportEmail: string;
  deliveryCharge: number;
  freeDeliveryOver: number;
  social: ReturnType<typeof socialProfiles>;
}

export function toPublicSettings(s: StoreSettings): PublicSiteSettings {
  return {
    storeName: s.storeName,
    siteLogoUrl: s.siteLogoUrl,
    themeColor: s.themeColor,
    supportPhone: s.supportPhone,
    supportEmail: s.supportEmail,
    deliveryCharge: s.deliveryCharge,
    freeDeliveryOver: s.freeDeliveryOver,
    social: socialProfiles(s),
  };
}
