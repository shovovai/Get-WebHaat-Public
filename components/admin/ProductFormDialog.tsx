"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Option {
  _id: string;
  title: string;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  price: string;
  discount: string;
  stock: string;
  status: string;
  variant: string;
  isFeatured: boolean;
  categoryIds: string[];
  brandId: string;
  images: { assetId: string; url: string }[];
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
  discount: "0",
  stock: "0",
  status: "",
  variant: "gadget",
  isFeatured: false,
  categoryIds: [],
  brandId: "",
  images: [],
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);

interface Props {
  open: boolean;
  productId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function ProductFormDialog({ open, productId, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [options, setOptions] = useState<{ categories: Option[]; brands: Option[] }>({
    categories: [],
    brands: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/products/options", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.success && setOptions({ categories: d.categories, brands: d.brands }))
      .catch(() => {});

    if (!productId) {
      setForm(EMPTY);
      setSlugTouched(false);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/products/${productId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error);
        const p = d.product;
        setForm({
          name: p.name || "",
          slug: p.slug || "",
          description: p.description || "",
          price: String(p.price ?? ""),
          discount: String(p.discount ?? 0),
          stock: String(p.stock ?? 0),
          status: p.status || "",
          variant: p.variant || "gadget",
          isFeatured: Boolean(p.isFeatured),
          categoryIds: p.categoryIds || [],
          brandId: p.brandId || "",
          images: (p.images || []).filter((i: { assetId?: string }) => i.assetId),
        });
        setSlugTouched(true);
      })
      .catch(() => toast.error("Could not load product"))
      .finally(() => setLoading(false));
  }, [open, productId]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onName = (name: string) =>
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));

  const uploadFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      setUploading((n) => n + 1);
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/uploads", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setForm((f) => ({ ...f, images: [...f.images, { assetId: data.assetId, url: data.url }] }));
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const moveImageFirst = (index: number) =>
    setForm((f) => {
      const images = [...f.images];
      const [img] = images.splice(index, 1);
      return { ...f, images: [img, ...images] };
    });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(productId ? `/api/admin/products/${productId}` : "/api/admin/products", {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imageAssetIds: form.images.map((i) => i.assetId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(productId ? "Product updated" : "Product created");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {loading ? (
          <div className="flex h-60 items-center justify-center text-gray-500">
            <DialogTitle className="sr-only">Loading product</DialogTitle>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <form onSubmit={save} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{productId ? "Edit product" : "New product"}</DialogTitle>
              <DialogDescription>
                Changes go live on the store right away.
              </DialogDescription>
            </DialogHeader>

            {/* Images */}
            <div className="space-y-2">
              <Label>Images</Label>
              <div className="flex flex-wrap gap-3">
                {form.images.map((img, i) => (
                  <div key={img.assetId} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <img src={`${img.url}?w=200&h=200&fit=max`} alt="" className="h-full w-full object-contain p-1" />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 rounded bg-gray-900/80 px-1.5 text-[10px] font-semibold text-white">
                        Main
                      </span>
                    )}
                    <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {i > 0 && (
                        <button type="button" onClick={() => moveImageFirst(i)} className="rounded bg-white p-1 shadow" title="Make main image">
                          <Star className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => set("images", form.images.filter((_, j) => j !== i))}
                        className="rounded bg-white p-1 shadow"
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-gray-500"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  {uploading ? "Uploading" : "Add"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={uploadFiles} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-name">Name *</Label>
                <Input id="p-name" required value={form.name} onChange={(e) => onName(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="p-slug">URL slug</Label>
                <Input
                  id="p-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Price *</Label>
                <Input id="p-price" type="number" min="0" step="0.01" required value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-discount">Discount shown (%)</Label>
                <Input id="p-discount" type="number" min="0" max="99" step="1" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stock *</Label>
                <Input id="p-stock" type="number" min="0" step="1" required value={form.stock} onChange={(e) => set("stock", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-brand">Brand</Label>
                <select
                  id="p-brand"
                  value={form.brandId}
                  onChange={(e) => set("brandId", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">No brand</option>
                  {options.brands.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-variant">Product type</Label>
                <select
                  id="p-variant"
                  value={form.variant}
                  onChange={(e) => set("variant", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="gadget">Gadget</option>
                  <option value="appliances">Appliances</option>
                  <option value="refrigerators">Refrigerators</option>
                  <option value="others">Others</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-status">Badge</Label>
                <select
                  id="p-status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">None</option>
                  <option value="new">New</option>
                  <option value="hot">Hot (shows on Deals page)</option>
                  <option value="sale">Sale</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-2">
                {options.categories.length === 0 && (
                  <p className="text-sm text-gray-500">No categories yet — create them in Content Studio.</p>
                )}
                {options.categories.map((c) => {
                  const on = form.categoryIds.includes(c._id);
                  return (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() =>
                        set("categoryIds", on ? form.categoryIds.filter((x) => x !== c._id) : [...form.categoryIds, c._id])
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm",
                        on ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"
                      )}
                    >
                      {c.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>

            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} />
              Featured product
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading > 0}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {productId ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
