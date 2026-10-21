import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import { cmsFetch } from "@/sanity/lib/fetch";
import { TAGS } from "@/lib/cache";
import { brand } from "@/config/brand";
import { DEFAULT_DELIVERY } from "@/lib/storeConfig";

export const STORE_SETTINGS_ID = "storeSettings";

export interface StoreSettings {
  adminPanelTitle: string;
  adminLogoUrl: string;
  accentColor: string;
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  currencySymbol: string;
  announcementEnabled: boolean;
  announcementText: string;
  announcementLink: string;
  // Delivery (applies to every order, any payment method)
  deliveryCharge: number;
  freeDeliveryOver: number;
  // Branding & icons
  siteLogoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
  themeColor: string;
  // Search engines
  seoTitle: string;
  seoTitleTemplate: string;
  seoDescription: string;
  seoKeywords: string;
  noindex: boolean;
  googleVerification: string;
  bingVerification: string;
  facebookDomainVerification: string;
  // Social profiles
  twitterHandle: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  // Analytics & ads
  googleAnalyticsId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  adsenseClientId: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  adminPanelTitle: `${brand.name} Admin`,
  adminLogoUrl: "",
  accentColor: "#0a0a0a",
  storeName: brand.name,
  supportEmail: brand.emails.support,
  supportPhone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "",
  currencySymbol: "$",
  announcementEnabled: false,
  announcementText: "",
  announcementLink: "",
  deliveryCharge: DEFAULT_DELIVERY.deliveryCharge,
  freeDeliveryOver: DEFAULT_DELIVERY.freeDeliveryOver,
  siteLogoUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  themeColor: "#0a0a0a",
  seoTitle: `${brand.name} - ${brand.tagline}`,
  seoTitleTemplate: `%s | ${brand.name}`,
  seoDescription: brand.description,
  seoKeywords: "online shopping, e-commerce, buy online, electronics, home appliances, deals",
  noindex: false,
  googleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  bingVerification: "",
  facebookDomainVerification: "",
  twitterHandle: brand.twitterHandle,
  facebookUrl: brand.social.facebook,
  instagramUrl: brand.social.instagram,
  twitterUrl: brand.social.twitter,
  youtubeUrl: brand.social.youtube,
  linkedinUrl: brand.social.linkedin,
  tiktokUrl: "",
  googleAnalyticsId: "",
  googleTagManagerId: "",
  facebookPixelId: "",
  adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
};

/** Format rules for settings that end up in <script> tags or meta tags */
export const SETTINGS_PATTERNS: Partial<Record<keyof StoreSettings, RegExp>> = {
  accentColor: /^#([0-9a-fA-F]{3}){1,2}$/,
  themeColor: /^#([0-9a-fA-F]{3}){1,2}$/,
  googleAnalyticsId: /^G-[A-Z0-9]{4,20}$/,
  googleTagManagerId: /^GTM-[A-Z0-9]{4,12}$/,
  facebookPixelId: /^\d{5,20}$/,
  adsenseClientId: /^ca-pub-\d{10,20}$/,
  twitterHandle: /^@?[A-Za-z0-9_]{1,15}$/,
  googleVerification: /^[A-Za-z0-9_-]{10,100}$/,
  bingVerification: /^[A-Za-z0-9_-]{10,100}$/,
  facebookDomainVerification: /^[A-Za-z0-9_-]{10,100}$/,
};

/** Fields that must be http(s) URLs when set */
export const URL_SETTINGS: (keyof StoreSettings)[] = [
  "adminLogoUrl",
  "siteLogoUrl",
  "faviconUrl",
  "ogImageUrl",
  "facebookUrl",
  "instagramUrl",
  "twitterUrl",
  "youtubeUrl",
  "linkedinUrl",
  "tiktokUrl",
];

export const EDITABLE_SETTINGS_KEYS = Object.keys(
  DEFAULT_STORE_SETTINGS
) as (keyof StoreSettings)[];

/**
 * Reads the singleton settings doc, falling back to defaults for empty fields.
 * Cached (tag "storeSettings", invalidated by Admin → Settings and the Sanity
 * webhook); `fresh` bypasses the cache for the admin editor.
 */
export async function getStoreSettings(
  options: { fresh?: boolean } = {}
): Promise<StoreSettings> {
  try {
    const query = `*[_id == $id][0]`;
    const params = { id: STORE_SETTINGS_ID };
    const doc = options.fresh
      ? await backendClient.fetch<Partial<StoreSettings> | null>(query, params, { cache: "no-store" })
      : await cmsFetch<Partial<StoreSettings> | null>(query, params, { tags: [TAGS.storeSettings] });
    const merged = { ...DEFAULT_STORE_SETTINGS };
    if (doc) {
      for (const key of EDITABLE_SETTINGS_KEYS) {
        const value = doc[key];
        if (value !== undefined && value !== null && value !== "") {
          (merged as Record<string, unknown>)[key] = value;
        }
      }
      merged.updatedAt = doc.updatedAt;
      merged.updatedBy = doc.updatedBy;
    }
    return merged;
  } catch (error) {
    console.error("Failed to load store settings:", error);
    return DEFAULT_STORE_SETTINGS;
  }
}
