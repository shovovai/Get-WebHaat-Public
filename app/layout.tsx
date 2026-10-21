import { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { brand } from "@/config/brand";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import SiteAnalytics from "@/components/SiteAnalytics";
import { defaultOgImage, getSiteSettings, siteIcon, toPublicSettings } from "@/lib/siteSeo";
import "./globals.css";

// Store typeface: General Sans by Indian Type Foundry (ITF Free Font License, free for commercial use)
const generalSans = localFont({
  src: [
    { path: "./fonts/GeneralSans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/GeneralSans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/GeneralSans-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/GeneralSans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-general",
  display: "swap",
});

// All SEO values come from Admin → SEO & Branding (with sensible defaults)
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const ogImage = defaultOgImage(s);
  const icon = siteIcon(s);
  const keywords = s.seoKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return {
    metadataBase: new URL(brand.url),
    applicationName: s.storeName,
    title: { template: s.seoTitleTemplate || `%s | ${s.storeName}`, default: s.seoTitle },
    description: s.seoDescription,
    keywords,
    authors: [{ name: s.storeName }],
    creator: s.storeName,
    publisher: s.storeName,
    formatDetection: { email: false, address: false, telephone: false },
    icons: { icon, shortcut: icon, apple: icon },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: brand.url,
      siteName: s.storeName,
      title: s.seoTitle,
      description: s.seoDescription,
      images: [{ url: ogImage, width: 1200, height: 630, alt: s.storeName }],
    },
    twitter: {
      card: "summary_large_image",
      title: s.seoTitle,
      description: s.seoDescription,
      images: [ogImage],
      ...(s.twitterHandle && { site: s.twitterHandle, creator: s.twitterHandle }),
    },
    robots: s.noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
    verification: {
      ...(s.googleVerification && { google: s.googleVerification }),
      other: {
        ...(s.bingVerification && { "msvalidate.01": s.bingVerification }),
        ...(s.facebookDomainVerification && {
          "facebook-domain-verification": s.facebookDomainVerification,
        }),
      },
    },
    appleWebApp: { capable: true, title: s.storeName, statusBarStyle: "default" },
    alternates: { canonical: "/" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const s = await getSiteSettings();
  return {
    themeColor: s.themeColor || "#0a0a0a",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const settings = await getSiteSettings();
  return (
    <ClerkProvider
      localization={{
        signIn: { start: { title: `Sign in to ${settings.storeName}` } },
        signUp: { start: { title: `Create your ${settings.storeName} account` } },
      }}
    >
      <html lang="en" className={generalSans.variable}>
        <body className="font-sans antialiased">
          <SiteSettingsProvider value={toPublicSettings(settings)}>
            {children}
          </SiteSettingsProvider>
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#1f2937",
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                fontSize: "14px",
              },
              className: "sonner-toast",
            }}
          />
          <SiteAnalytics settings={settings} />
        </body>
      </html>
    </ClerkProvider>
  );
};

export default RootLayout;
