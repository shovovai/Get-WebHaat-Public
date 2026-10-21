"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { AlertTriangle, Copy, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Config = Record<string, any>;

interface ManualAccount {
  id: string;
  provider: string;
  label: string;
  accountNumber: string;
  accountType: string;
  instructions: string;
  enabled: boolean;
}

const newAccount = (): ManualAccount => ({
  id: Math.random().toString(36).slice(2, 10),
  provider: "bkash",
  label: "bKash Personal",
  accountNumber: "",
  accountType: "personal",
  instructions: "",
  enabled: true,
});

function GatewayCard({
  title,
  subtitle,
  enabled,
  onToggle,
  children,
  badge,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200">
      <div className="flex items-center justify-between gap-4 p-5">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            {title} {badge}
          </h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && <div className="grid gap-4 border-t border-gray-100 p-5 sm:grid-cols-2">{children}</div>}
    </section>
  );
}

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <button
        type="button"
        className="flex items-center gap-1 font-mono text-gray-800"
        onClick={() => {
          navigator.clipboard.writeText(value).catch(() => {});
          toast.success("Copied");
        }}
      >
        {value} <Copy className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function AdminPaymentGateways() {
  const [config, setConfig] = useState<Config | null>(null);
  const [callbacks, setCallbacks] = useState<Record<string, string>>({});
  const [encryptionReady, setEncryptionReady] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/payment-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        setConfig(d.config);
        setCallbacks(d.callbacks);
        setEncryptionReady(d.encryptionReady);
      })
      .catch(() => toast.error("Could not load payment settings"));
  }, []);

  if (!config) {
    return (
      <div className="flex h-60 items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  const set = (gateway: string, field: string, value: unknown) =>
    setConfig((c) => (c ? { ...c, [gateway]: { ...c[gateway], [field]: value } } : c));

  const text = (gateway: string, field: string, props: Record<string, unknown> = {}) => (
    <Input value={config[gateway][field] ?? ""} onChange={(e) => set(gateway, field, e.target.value)} {...props} />
  );

  const secret = (gateway: string, field: string) => {
    const preview = config[gateway][`${field}Preview`];
    return (
      <Input
        type="password"
        autoComplete="new-password"
        value={config[gateway][field] ?? ""}
        onChange={(e) => set(gateway, field, e.target.value)}
        placeholder={preview ? `Saved (${preview}) — leave blank to keep` : "Not set"}
      />
    );
  };

  const accounts: ManualAccount[] = config.manual.accounts || [];
  const setAccounts = (list: ManualAccount[]) => set("manual", "accounts", list);
  const updateAccount = (i: number, patch: Partial<ManualAccount>) =>
    setAccounts(accounts.map((a, j) => (j === i ? { ...a, ...patch } : a)));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfig(data.config);
      toast.success("Payment settings saved");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const sandboxToggle = (gateway: string) => (
    <Field label="Mode" hint="Use sandbox to test with fake money first.">
      <div className="flex h-9 items-center gap-3 text-sm">
        <Switch checked={!config[gateway].sandbox} onCheckedChange={(v) => set(gateway, "sandbox", !v)} />
        {config[gateway].sandbox ? "Sandbox (testing)" : "Live payments"}
      </div>
    </Field>
  );

  const liveBadge = (gateway: string) =>
    config[gateway].enabled ? (
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${config[gateway].sandbox ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
        {config[gateway].sandbox ? "Sandbox" : "Live"}
      </span>
    ) : null;

  return (
    <form onSubmit={save} className="space-y-5">
      {!encryptionReady && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            <b>PAYMENT_ENCRYPTION_KEY</b> is not set in <code>.env</code>. Add a long random value and restart the
            server — gateway credentials are stored encrypted and cannot be saved without it.
          </p>
        </div>
      )}

      <GatewayCard
        title="Cash on delivery"
        subtitle="Customer pays the delivery person."
        enabled={config.cod.enabled}
        onToggle={(v) => set("cod", "enabled", v)}
      >
        <Field label="Name at checkout">{text("cod", "label")}</Field>
        <Field label="Maximum order amount" hint="Hide COD above this total (0 = no limit)">
          {text("cod", "maxOrderAmount", { type: "number", min: 0, step: "1" })}
        </Field>
        <Field label="Instructions" wide>
          <Textarea rows={2} value={config.cod.instructions} onChange={(e) => set("cod", "instructions", e.target.value)} />
        </Field>
      </GatewayCard>

      <GatewayCard
        title="bKash (merchant)"
        subtitle="bKash Tokenized Checkout — money goes straight to your bKash merchant account."
        enabled={config.bkash.enabled}
        onToggle={(v) => set("bkash", "enabled", v)}
        badge={liveBadge("bkash")}
      >
        <Field label="Name at checkout">{text("bkash", "label")}</Field>
        {sandboxToggle("bkash")}
        <Field label="App key">{text("bkash", "appKey")}</Field>
        <Field label="App secret">{secret("bkash", "appSecret")}</Field>
        <Field label="Username">{text("bkash", "username")}</Field>
        <Field label="Password">{secret("bkash", "password")}</Field>
        <CopyLine label="Callback URL (share with bKash)" value={callbacks.bkash} />
      </GatewayCard>

      <GatewayCard
        title="Nagad (merchant)"
        subtitle="Nagad online payment — requires a Nagad merchant account and keys."
        enabled={config.nagad.enabled}
        onToggle={(v) => set("nagad", "enabled", v)}
        badge={liveBadge("nagad")}
      >
        <Field label="Name at checkout">{text("nagad", "label")}</Field>
        {sandboxToggle("nagad")}
        <Field label="Merchant ID">{text("nagad", "merchantId")}</Field>
        <Field label="Merchant number" hint="Optional">{text("nagad", "merchantNumber")}</Field>
        <Field label="Merchant private key" wide hint="Paste the private key Nagad gave you (PEM or base64).">
          <Textarea
            rows={3}
            className="font-mono text-xs"
            value={config.nagad.merchantPrivateKey}
            onChange={(e) => set("nagad", "merchantPrivateKey", e.target.value)}
            placeholder={config.nagad.merchantPrivateKeyPreview ? `Saved (${config.nagad.merchantPrivateKeyPreview}) — leave blank to keep` : "Not set"}
          />
        </Field>
        <Field label="Nagad public key" wide>
          <Textarea rows={3} className="font-mono text-xs" value={config.nagad.pgPublicKey} onChange={(e) => set("nagad", "pgPublicKey", e.target.value)} />
        </Field>
        <CopyLine label="Callback URL" value={callbacks.nagad} />
      </GatewayCard>

      <GatewayCard
        title="SSLCommerz"
        subtitle="One gateway for cards, bKash, Nagad, Rocket and net banking."
        enabled={config.sslcommerz.enabled}
        onToggle={(v) => set("sslcommerz", "enabled", v)}
        badge={liveBadge("sslcommerz")}
      >
        <Field label="Name at checkout">{text("sslcommerz", "label")}</Field>
        {sandboxToggle("sslcommerz")}
        <Field label="Store ID">{text("sslcommerz", "storeId")}</Field>
        <Field label="Store password">{secret("sslcommerz", "storePassword")}</Field>
        <CopyLine label="IPN URL" value={callbacks.sslcommerzIpn} />
      </GatewayCard>

      <GatewayCard
        title="Stripe"
        subtitle="International credit and debit cards."
        enabled={config.stripe.enabled}
        onToggle={(v) => set("stripe", "enabled", v)}
      >
        <Field label="Name at checkout">{text("stripe", "label")}</Field>
        <Field label="Secret key" hint="sk_live_… or sk_test_…">{secret("stripe", "secretKey")}</Field>
        <Field label="Webhook signing secret" hint="whsec_…">{secret("stripe", "webhookSecret")}</Field>
        <CopyLine label="Webhook URL (event: checkout.session.completed)" value={callbacks.stripeWebhook} />
      </GatewayCard>

      <GatewayCard
        title="Manual payment (personal / agent numbers)"
        subtitle="Customer sends money to your number and enters the TrxID. You approve it in Verifications."
        enabled={config.manual.enabled}
        onToggle={(v) => set("manual", "enabled", v)}
      >
        <div className="space-y-4 sm:col-span-2">
          {accounts.length === 0 && <p className="text-sm text-gray-500">Add the numbers customers should send money to.</p>}
          {accounts.map((a, i) => (
            <div key={a.id} className="grid gap-3 rounded-xl border border-gray-200 p-4 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <select
                  value={a.provider}
                  onChange={(e) => updateAccount(i, { provider: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="upay">Upay</option>
                  <option value="bank">Bank transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Account type</Label>
                <select
                  value={a.accountType}
                  onChange={(e) => updateAccount(i, { accountType: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="personal">Personal (Send Money)</option>
                  <option value="agent">Agent (Cash Out)</option>
                  <option value="merchant">Merchant (Payment)</option>
                  <option value="bank">Bank account</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Name at checkout</Label>
                <Input value={a.label} onChange={(e) => updateAccount(i, { label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Number / account</Label>
                <Input
                  value={a.accountNumber}
                  onChange={(e) => updateAccount(i, { accountNumber: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Extra instructions (optional)</Label>
                <Input
                  value={a.instructions}
                  onChange={(e) => updateAccount(i, { instructions: e.target.value })}
                  placeholder="e.g. Use your order number as reference"
                />
              </div>
              <div className="flex items-end justify-between gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={a.enabled} onCheckedChange={(v) => updateAccount(i, { enabled: v })} /> Active
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => setAccounts(accounts.filter((_, j) => j !== i))} aria-label="Remove">
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setAccounts([...accounts, newAccount()])}>
            <Plus className="mr-2 h-4 w-4" /> Add number
          </Button>
        </div>
      </GatewayCard>

      <div className="sticky bottom-0 -mx-6 flex justify-end border-t border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
        <Button type="submit" disabled={saving || !encryptionReady}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save payment settings
        </Button>
      </div>
    </form>
  );
}
