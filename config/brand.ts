// Central brand configuration for WebHaat.
// Change values here (or via env vars) to rebrand the whole store.

export const brand = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "WebHaat",
  tagline: "Your Trusted Online Marketplace",
  description:
    process.env.NEXT_PUBLIC_COMPANY_DESCRIPTION ||
    "Discover amazing products at WebHaat, your trusted online marketplace for quality items and exceptional customer service.",
  url: (process.env.NEXT_PUBLIC_BASE_URL || "https://webhaat.com").replace(
    /\/$/,
    ""
  ),
  twitterHandle: process.env.NEXT_PUBLIC_TWITTER_HANDLE || "@webhaat",
  emails: {
    support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@webhaat.com",
    sales: process.env.NEXT_PUBLIC_SALES_EMAIL || "sales@webhaat.com",
    legal:
      process.env.NEXT_PUBLIC_LEGAL_EMAIL ||
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
      "legal@webhaat.com",
    privacy:
      process.env.NEXT_PUBLIC_PRIVACY_EMAIL ||
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL ||
      "privacy@webhaat.com",
  },
  social: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "https://facebook.com/webhaat",
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL || "https://twitter.com/webhaat",
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/webhaat",
    linkedin:
      process.env.NEXT_PUBLIC_LINKEDIN_URL ||
      "https://linkedin.com/company/webhaat",
    youtube: process.env.NEXT_PUBLIC_YOUTUBE_URL || "https://youtube.com/@webhaat",
  },
  // Small "Powered by WebHaat" credit in the footer. Set NEXT_PUBLIC_SHOW_POWERED_BY=false to hide it.
  poweredBy: {
    show: process.env.NEXT_PUBLIC_SHOW_POWERED_BY !== "false",
    url:
      process.env.NEXT_PUBLIC_POWERED_BY_URL ||
      "https://github.com/shovovai/ecom-illiyan",
  },
} as const;
