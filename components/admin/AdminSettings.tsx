"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Palette, Save, Store, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ImageUploadField from "./ImageUploadField";

interface Settings {
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
  deliveryCharge: number;
  freeDeliveryOver: number;
  updatedAt?: string;
  updatedBy?: string;
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-b border-gray-100 py-8 first:pt-0 last:border-0 lg:grid-cols-3">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-gray-900">
          <Icon className="h-4 w-4" /> {title}
        </h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="space-y-4 lg:col-span-2">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function AdminSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setSettings(d.settings))
      .catch(() => toast.error("Failed to load settings"));
  }, []);

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading settings…
      </div>
    );
  }

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  const text = (key: keyof Settings) => ({
    id: key,
    value: String(settings[key] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never),
  });

  const money = (key: "deliveryCharge" | "freeDeliveryOver") => ({
    id: key,
    type: "number",
    min: 0,
    step: "0.01",
    inputMode: "decimal" as const,
    value: String(settings[key] ?? 0),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(key, e.target.value === "" ? 0 : Math.max(0, Number(e.target.value) || 0)),
  });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { updatedAt, updatedBy, ...payload } = settings;
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      setSettings(data.settings);
      toast.success("Settings saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="p-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Store Settings</h2>
          <p className="text-sm text-gray-500">
            {settings.updatedAt
              ? `Last updated ${new Date(settings.updatedAt).toLocaleString()} by ${settings.updatedBy}`
              : "Customize the admin panel and storefront without touching code."}
          </p>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <Section icon={Palette} title="Admin branding" description="Name and logo shown in this admin panel.">
        <Field id="adminPanelTitle" label="Panel title">
          <Input {...text("adminPanelTitle")} />
        </Field>
        <Field id="adminLogoUrl" label="Admin panel logo" hint="Square image. The store logo, favicon and share image are in SEO & Branding.">
          <ImageUploadField value={settings.adminLogoUrl} onChange={(v) => set("adminLogoUrl", v)} previewClassName="h-16 w-16" />
        </Field>
      </Section>

      <Section icon={Store} title="Store info" description="Used in the admin panel, reports, exports and email campaigns.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="storeName" label="Store name">
            <Input {...text("storeName")} />
          </Field>
          <Field id="currencySymbol" label="Currency symbol">
            <Input {...text("currencySymbol")} className="w-24" />
          </Field>
          <Field id="supportEmail" label="Support email">
            <Input {...text("supportEmail")} type="email" />
          </Field>
          <Field id="supportPhone" label="Support phone">
            <Input {...text("supportPhone")} />
          </Field>
        </div>
      </Section>

      <Section
        icon={Truck}
        title="Delivery"
        description="Added to every order, whatever payment method the customer picks."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="deliveryCharge" label="Delivery charge" hint="0 = free delivery on every order">
            <Input {...money("deliveryCharge")} />
          </Field>
          <Field id="freeDeliveryOver" label="Free delivery on orders over" hint="0 = always charge delivery">
            <Input {...money("freeDeliveryOver")} />
          </Field>
        </div>
      </Section>

      <Section icon={Megaphone} title="Announcement bar" description="A slim banner at the top of every storefront page.">
        <div className="flex items-center gap-3">
          <Switch
            id="announcementEnabled"
            checked={settings.announcementEnabled}
            onCheckedChange={(v) => set("announcementEnabled", v)}
          />
          <Label htmlFor="announcementEnabled">Show announcement bar</Label>
        </div>
        <Field id="announcementText" label="Text">
          <Input {...text("announcementText")} placeholder="Free delivery on orders over $50 this week!" />
        </Field>
        <Field id="announcementLink" label="Link (optional)" hint="e.g. /deal or https://…">
          <Input {...text("announcementLink")} placeholder="/deal" />
        </Field>
        {settings.announcementEnabled && settings.announcementText && (
          <div
            className="rounded-lg px-4 py-2 text-center text-sm font-medium text-white"
            style={{ background: "#0a0a0a" }}
          >
            {settings.announcementText}
          </div>
        )}
      </Section>
    </form>
  );
}
