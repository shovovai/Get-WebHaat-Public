import { CogIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

// Singleton document (_id: "storeSettings") edited from /admin/settings
export const storeSettingsType = defineType({
  name: "storeSettings",
  title: "Store Settings",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "branding", title: "Admin Branding", default: true },
    { name: "store", title: "Store Info" },
    { name: "announcement", title: "Announcement Bar" },
    { name: "seo", title: "SEO & Branding" },
  ],
  fields: [
    defineField({
      name: "adminPanelTitle",
      title: "Admin Panel Title",
      type: "string",
      group: "branding",
    }),
    defineField({
      name: "adminLogoUrl",
      title: "Admin Logo URL",
      type: "url",
      group: "branding",
    }),
    defineField({
      name: "accentColor",
      title: "Accent Color (hex)",
      type: "string",
      group: "branding",
      validation: (Rule) =>
        Rule.regex(/^#([0-9a-fA-F]{3}){1,2}$/, { name: "hex color" }),
    }),
    defineField({
      name: "storeName",
      title: "Store Name",
      type: "string",
      group: "store",
    }),
    defineField({
      name: "supportEmail",
      title: "Support Email",
      type: "string",
      group: "store",
    }),
    defineField({
      name: "supportPhone",
      title: "Support Phone",
      type: "string",
      group: "store",
    }),
    defineField({
      name: "deliveryCharge",
      title: "Delivery Charge",
      description: "Added to every order, whatever the payment method. 0 = free delivery.",
      type: "number",
      group: "store",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "freeDeliveryOver",
      title: "Free Delivery Over",
      description: "Orders at or above this amount ship free. 0 = never free.",
      type: "number",
      group: "store",
      validation: (Rule) => Rule.min(0),
    }),
    defineField({
      name: "currencySymbol",
      title: "Currency Symbol (reports & exports)",
      type: "string",
      group: "store",
    }),
    defineField({
      name: "announcementEnabled",
      title: "Show Announcement Bar",
      type: "boolean",
      group: "announcement",
      initialValue: false,
    }),
    defineField({
      name: "announcementText",
      title: "Announcement Text",
      type: "string",
      group: "announcement",
    }),
    defineField({
      name: "announcementLink",
      title: "Announcement Link",
      type: "string",
      group: "announcement",
    }),
    // ---- SEO & branding (edited in Admin → SEO & Branding) ----
    ...(
      [
        ["siteLogoUrl", "Site logo URL", "url"],
        ["faviconUrl", "Favicon / app icon URL", "url"],
        ["ogImageUrl", "Social share image (OG) URL", "url"],
        ["themeColor", "Browser theme color", "string"],
        ["seoTitle", "Home page title", "string"],
        ["seoTitleTemplate", "Title template (%s = page title)", "string"],
        ["seoDescription", "Meta description", "text"],
        ["seoKeywords", "Keywords (comma separated)", "string"],
        ["noindex", "Hide site from search engines", "boolean"],
        ["googleVerification", "Google Search Console code", "string"],
        ["bingVerification", "Bing Webmaster code", "string"],
        ["facebookDomainVerification", "Facebook domain verification", "string"],
        ["twitterHandle", "X / Twitter handle", "string"],
        ["facebookUrl", "Facebook page", "url"],
        ["instagramUrl", "Instagram", "url"],
        ["twitterUrl", "X / Twitter", "url"],
        ["youtubeUrl", "YouTube", "url"],
        ["linkedinUrl", "LinkedIn", "url"],
        ["tiktokUrl", "TikTok", "url"],
        ["googleAnalyticsId", "Google Analytics 4 ID", "string"],
        ["googleTagManagerId", "Google Tag Manager ID", "string"],
        ["facebookPixelId", "Meta (Facebook) Pixel ID", "string"],
        ["adsenseClientId", "Google AdSense publisher ID", "string"],
      ] as const
    ).map(([name, title, type]) => defineField({ name, title, type, group: "seo" })),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "updatedBy",
      title: "Updated By",
      type: "string",
      readOnly: true,
    }),
  ],
  preview: {
    prepare: () => ({ title: "Store Settings" }),
  },
});
