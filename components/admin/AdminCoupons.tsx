"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/storeConfig";

interface Coupon {
  _id: string;
  code: string;
  description?: string;
  discountType: "percent" | "fixed";
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  startsAt?: string;
  expiresAt?: string;
  usageLimit?: number;
  usedCount?: number;
  oncePerCustomer?: boolean;
  active?: boolean;
}

type FormState = {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  value: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  startsAt: string;
  expiresAt: string;
  usageLimit: string;
  oncePerCustomer: boolean;
  active: boolean;
};

const EMPTY: FormState = {
  code: "",
  description: "",
  discountType: "percent",
  value: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  oncePerCustomer: false,
  active: true,
};

const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

function statusOf(c: Coupon) {
  const now = Date.now();
  if (!c.active) return { label: "Inactive", cls: "bg-gray-100 text-gray-600" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: "Expired", cls: "bg-red-50 text-red-700" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "Scheduled", cls: "bg-amber-50 text-amber-700" };
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) return { label: "Used up", cls: "bg-gray-100 text-gray-600" };
  return { label: "Active", cls: "bg-green-50 text-green-700" };
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCoupons(data.coupons);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discountType: c.discountType,
      value: String(c.value),
      minOrderAmount: c.minOrderAmount?.toString() || "",
      maxDiscountAmount: c.maxDiscountAmount?.toString() || "",
      startsAt: toLocalInput(c.startsAt),
      expiresAt: toLocalInput(c.expiresAt),
      usageLimit: c.usageLimit?.toString() || "",
      oncePerCustomer: Boolean(c.oncePerCustomer),
      active: c.active !== false,
    });
    setOpen(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      value: Number(form.value),
      minOrderAmount: form.minOrderAmount || null,
      maxDiscountAmount: form.discountType === "percent" ? form.maxDiscountAmount || null : null,
      usageLimit: form.usageLimit || null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    try {
      const res = await fetch(editing ? `/api/admin/coupons/${editing._id}` : "/api/admin/coupons", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "Coupon updated" : "Coupon created");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Coupon, active: boolean) => {
    setCoupons((list) => list.map((x) => (x._id === c._id ? { ...x, active } : x)));
    const res = await fetch(`/api/admin/coupons/${c._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      toast.error("Could not update coupon");
      load();
    }
  };

  const remove = async (c: Coupon) => {
    if (!window.confirm(`Delete coupon ${c.code}? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/coupons/${c._id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Coupon deleted");
      setCoupons((list) => list.filter((x) => x._id !== c._id));
    } else toast.error("Delete failed");
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Coupons & discount codes</h2>
          <p className="text-sm text-gray-500">Customers enter these codes in the cart or at checkout.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> New coupon
        </Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <TicketPercent className="mb-3 h-10 w-10 text-gray-400" />
          <p className="font-medium text-gray-900">No coupons yet</p>
          <p className="mb-4 text-sm text-gray-500">Create a code like WELCOME10 for new customers.</p>
          <Button onClick={openCreate} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Create first coupon
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Rules</th>
                <th className="px-4 py-3 font-medium">Used</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const st = statusOf(c);
                return (
                  <tr key={c._id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-gray-900">{c.code}</p>
                      {c.description && <p className="text-xs text-gray-500">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {c.discountType === "percent" ? `${c.value}%` : formatPrice(c.value)}
                      {c.discountType === "percent" && c.maxDiscountAmount ? (
                        <span className="block text-xs font-normal text-gray-500">max {formatPrice(c.maxDiscountAmount)}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.minOrderAmount ? <div>Min {formatPrice(c.minOrderAmount)}</div> : null}
                      {c.oncePerCustomer ? <div>Once per customer</div> : null}
                      {c.expiresAt ? <div>Ends {new Date(c.expiresAt).toLocaleDateString()}</div> : null}
                      {!c.minOrderAmount && !c.oncePerCustomer && !c.expiresAt && "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.usedCount || 0}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Switch checked={c.active !== false} onCheckedChange={(v) => toggle(c, v)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(c)} aria-label="Delete">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={save} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${editing.code}` : "New coupon"}</DialogTitle>
              <DialogDescription>Discounts apply to the order subtotal (after any business discount).</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-code">Code *</Label>
                <Input
                  id="c-code"
                  required
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
                  placeholder="WELCOME10"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <div className="flex rounded-lg border border-gray-200 p-1">
                  {(["percent", "fixed"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => set("discountType", t)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                        form.discountType === t ? "bg-gray-900 text-white" : "text-gray-600"
                      }`}
                    >
                      {t === "percent" ? "Percent %" : "Fixed amount"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-value">Value *</Label>
                <Input id="c-value" type="number" min="0" step="0.01" required value={form.value} onChange={(e) => set("value", e.target.value)} placeholder={form.discountType === "percent" ? "10" : "5.00"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-min">Minimum subtotal</Label>
                <Input id="c-min" type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} placeholder="None" />
              </div>
              {form.discountType === "percent" && (
                <div className="space-y-1.5">
                  <Label htmlFor="c-max">Max discount</Label>
                  <Input id="c-max" type="number" min="0" step="0.01" value={form.maxDiscountAmount} onChange={(e) => set("maxDiscountAmount", e.target.value)} placeholder="No cap" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="c-start">Starts</Label>
                <Input id="c-start" type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-end">Expires</Label>
                <Input id="c-end" type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-limit">Total uses</Label>
                <Input id="c-limit" type="number" min="1" step="1" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="Unlimited" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-desc">Internal note</Label>
                <Input id="c-desc" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Instagram campaign, March" />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.oncePerCustomer} onCheckedChange={(v) => set("oncePerCustomer", v)} />
                Once per customer
              </label>
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
                Active
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
