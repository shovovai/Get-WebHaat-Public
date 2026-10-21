import Script from "next/script";
import { SETTINGS_PATTERNS, type StoreSettings } from "@/lib/storeSettings";

const valid = (key: keyof StoreSettings, value: string) =>
  Boolean(value) && (SETTINGS_PATTERNS[key]?.test(value) ?? false);

// Google Analytics 4, Google Tag Manager, Meta Pixel and AdSense —
// each enabled by entering its ID in Admin → SEO & Branding.
export default function SiteAnalytics({ settings }: { settings: StoreSettings }) {
  const ga = valid("googleAnalyticsId", settings.googleAnalyticsId) ? settings.googleAnalyticsId : "";
  const gtm = valid("googleTagManagerId", settings.googleTagManagerId) ? settings.googleTagManagerId : "";
  const pixel = valid("facebookPixelId", settings.facebookPixelId) ? settings.facebookPixelId : "";
  const adsense = valid("adsenseClientId", settings.adsenseClientId) ? settings.adsenseClientId : "";

  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
      {gtm && (
        <>
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
      {adsense && (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense}`}
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}
    </>
  );
}
