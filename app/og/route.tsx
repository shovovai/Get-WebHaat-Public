import { ImageResponse } from "next/og";
import { getStoreSettings } from "@/lib/storeSettings";

// Default social share image (1200×630) used when no OG image is uploaded
// in Admin → SEO & Branding. Optional ?title= for page-specific text.
export async function GET(request: Request) {
  const settings = await getStoreSettings();
  const title = new URL(request.url).searchParams.get("title")?.slice(0, 90);
  const accent = settings.themeColor || "#0a0a0a";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbf8f3",
          padding: "70px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 22,
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fbf8f3",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            {settings.storeName.charAt(0)}
          </div>
          <div style={{ fontSize: 44, color: "#1f1a17", fontWeight: 700 }}>{settings.storeName}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: title ? 64 : 76, color: "#1f1a17", lineHeight: 1.05, maxWidth: 1000 }}>
            {title || settings.seoTitle}
          </div>
          {!title && (
            <div style={{ fontSize: 30, color: "#6b625b", maxWidth: 950, fontFamily: "sans-serif" }}>
              {settings.seoDescription.slice(0, 140)}
            </div>
          )}
        </div>

        <div style={{ display: "flex", height: 14, width: "100%" }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{ flex: 1, background: i % 2 ? "#e0a23b" : accent }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
