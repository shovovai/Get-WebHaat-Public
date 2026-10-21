"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Loader2,
  Save,
  Search,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ImageUploadField from "./ImageUploadField";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = Record<string, any>;

const SEO_KEYS = [
  "siteLogoUrl",
  "faviconUrl",
  "ogImageUrl",
  "themeColor",
  "seoTitle",
  "seoTitleTemplate",
  "seoDescription",
  "seoKeywords",
  "noindex",
  "googleVerification",
  "bingVerification",
  "facebookDomainVerification",
  "twitterHandle",
  "facebookUrl",
  "instagramUrl",
  "twitterUrl",
  "youtubeUrl",
  "linkedinUrl",
  "tiktokUrl",
  "googleAnalyticsId",
  "googleTagManagerId",
  "facebookPixelId",
  "adsenseClientId",
];

function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-gray-100 py-8 first:pt-0 last:border-0 lg:grid-cols-3">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <Icon className="h-4 w-4" /> {title}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="space-y-5 lg:col-span-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Counter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length;
  const color = n === 0 ? "text-gray-400" : n < min || n > max ? "text-amber-600" : "text-green-600";
  return (
    <span className={color}>
      {n} characters (ideal {min}–{max})
    </span>
  );
}

export default function AdminSeoSettings() {
  const router = useRouter();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setS(d.settings))
      .catch(() => toast.error("Failed to load settings"));
  }, []);

  if (!s) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const set = (key: string, value: unknown) => setS((prev) => (prev ? { ...prev, [key]: value } : prev));
  const text = (key: string, props: Record<string, unknown> = {}) => (
    <Input value={s[key] ?? ""} onChange={(e) => set(key, e.target.value)} {...props} />
  );

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.fromEntries(SEO_KEYS.map((k) => [k, s[k]]));
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setS(data.settings);
      toast.success("SEO & branding saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewTitle = s.seoTitle || s.storeName;
  const previewDesc = s.seoDescription || "";

  return (
    <form onSubmit={save} className="p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">SEO & Branding</h2>
          <p className="text-sm text-gray-500">
            Logo, icons, how the store appears on Google and social media, and tracking codes.
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <Section icon={ImageIcon} title="Logo & icons" description="Shown in the header, footer, browser tab and on phones when the store is added to the home screen.">
        <Field label="Store logo">
          <ImageUploadField
            value={s.siteLogoUrl}
            onChange={(v) => set("siteLogoUrl", v)}
            previewClassName="h-20 w-48"
            hint="Horizontal logo, transparent PNG or SVG, about 400×100 px. Leave empty to use the built-in logo."
          />
        </Field>
        <Field label="Favicon / app icon">
          <ImageUploadField
            value={s.faviconUrl}
            onChange={(v) => set("faviconUrl", v)}
            previewClassName="h-20 w-20"
            accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
            hint="Square PNG, at least 512×512 px. Used for the browser tab, bookmarks and the phone home-screen icon."
          />
        </Field>
        <Field label="Social share image (Open Graph)">
          <ImageUploadField
            value={s.ogImageUrl}
            onChange={(v) => set("ogImageUrl", v)}
            previewClassName="aspect-[1200/630] w-60"
            hint="1200×630 px. Appears when your store link is shared on Facebook, WhatsApp, X, LinkedIn… Leave empty for an automatic branded image."
          />
        </Field>
        <Field label="Browser / app theme color" hint="Colors the phone status bar and the installed app.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={s.themeColor || "#0a0a0a"}
              onChange={(e) => set("themeColor", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-gray-200 bg-white p-1"
              aria-label="Theme color"
            />
            {text("themeColor", { className: "w-32 font-mono" })}
          </div>
        </Field>
      </Section>

      <Section icon={Search} title="Search engine listing" description="How the home page appears in Google. Product and category pages use their own names and descriptions automatically.">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Google preview</p>
          <p className="mt-2 truncate text-sm text-gray-600">{origin}</p>
          <p className="truncate text-lg text-[#1a0dab]">{previewTitle}</p>
          <p className="line-clamp-2 text-sm text-gray-600">{previewDesc}</p>
        </div>
        <Field label="Home page title" hint={<Counter value={s.seoTitle || ""} min={30} max={60} />}>
          {text("seoTitle")}
        </Field>
        <Field label="Title template for other pages" hint='Use %s for the page name, e.g. "%s | WebHaat"'>
          {text("seoTitleTemplate")}
        </Field>
        <Field label="Meta description" hint={<Counter value={s.seoDescription || ""} min={70} max={160} />}>
          <Textarea rows={3} value={s.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
        </Field>
        <Field label="Keywords" hint="Comma separated. Minor ranking factor, but helps some search engines.">
          {text("seoKeywords")}
        </Field>
      </Section>

      <Section icon={Share2} title="Social profiles" description="Linked in the footer and in Google's knowledge panel (structured data). Leave empty to hide an icon.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facebook page">{text("facebookUrl", { placeholder: "https://facebook.com/yourstore" })}</Field>
          <Field label="Instagram">{text("instagramUrl", { placeholder: "https://instagram.com/yourstore" })}</Field>
          <Field label="X / Twitter">{text("twitterUrl", { placeholder: "https://x.com/yourstore" })}</Field>
          <Field label="X / Twitter handle">{text("twitterHandle", { placeholder: "@yourstore" })}</Field>
          <Field label="YouTube">{text("youtubeUrl")}</Field>
          <Field label="LinkedIn">{text("linkedinUrl")}</Field>
          <Field label="TikTok">{text("tiktokUrl")}</Field>
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Verification & indexing" description="Prove ownership to search engines and control whether the store can be indexed.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Google Search Console" hint='The content="…" value of the HTML tag method'>
            {text("googleVerification")}
          </Field>
          <Field label="Bing Webmaster Tools">{text("bingVerification")}</Field>
          <Field label="Facebook domain verification">{text("facebookDomainVerification")}</Field>
        </div>
        <label className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${s.noindex ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}>
          <Switch checked={!!s.noindex} onCheckedChange={(v) => set("noindex", v)} />
          <span>
            <span className="font-medium text-gray-900">Hide the whole store from search engines</span>
            <span className="block text-gray-500">
              Only for staging / testing. Adds noindex and blocks crawlers in robots.txt.
            </span>
            {s.noindex && (
              <span className="mt-2 flex items-center gap-1.5 font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Your store will disappear from Google while this is on.
              </span>
            )}
          </span>
        </label>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          {[
            ["Sitemap", "/sitemap.xml"],
            ["Robots.txt", "/robots.txt"],
            ["App manifest", "/manifest.webmanifest"],
          ].map(([label, path]) => (
            <a
              key={path}
              href={path}
              target="_blank"
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
            >
              {label} <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Submit <code className="rounded bg-gray-100 px-1">{origin}/sitemap.xml</code> in Google Search Console and Bing
          Webmaster Tools. It updates automatically with every product, category, brand and blog post.
        </p>
      </Section>

      <Section icon={BarChart3} title="Analytics & ads" description="Paste only the ID — the tracking code is added to every page automatically.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Google Analytics 4" hint="Format: G-XXXXXXXXXX">{text("googleAnalyticsId", { placeholder: "G-XXXXXXXXXX" })}</Field>
          <Field label="Google Tag Manager" hint="Format: GTM-XXXXXXX">{text("googleTagManagerId", { placeholder: "GTM-XXXXXXX" })}</Field>
          <Field label="Meta (Facebook) Pixel" hint="Numbers only">{text("facebookPixelId", { placeholder: "123456789012345" })}</Field>
          <Field label="Google AdSense" hint="Format: ca-pub-XXXXXXXXXXXXXXXX">{text("adsenseClientId", { placeholder: "ca-pub-…" })}</Field>
        </div>
        <p className="flex items-center gap-2 text-xs text-gray-500">
          <Globe className="h-3.5 w-3.5" /> If you use Google Tag Manager, you usually don&apos;t need to add GA4 here as well.
        </p>
      </Section>
    </form>
  );
}
