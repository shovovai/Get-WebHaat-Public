import "server-only";
import crypto from "crypto";

export const PRODUCT_STATUSES = ["new", "hot", "sale"] as const;
export const PRODUCT_VARIANTS = ["gadget", "appliances", "refrigerators", "others"] as const;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

const key = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);

/** Validates the admin product form and maps it to Sanity fields */
export function parseProductInput(
  body: Record<string, unknown>
): { ok: true; doc: Record<string, unknown> } | { ok: false; error: string } {
  const name = String(body.name || "").trim();
  if (name.length < 2) return { ok: false, error: "Product name is required" };

  const price = Number(body.price);
  if (!(price >= 0)) return { ok: false, error: "Price must be 0 or more" };

  const discount = body.discount === "" || body.discount == null ? 0 : Number(body.discount);
  if (!(discount >= 0 && discount < 100)) {
    return { ok: false, error: "Discount must be between 0 and 99" };
  }

  const stock = body.stock === "" || body.stock == null ? 0 : Math.floor(Number(body.stock));
  if (!(stock >= 0)) return { ok: false, error: "Stock must be 0 or more" };

  const slug = slugify(String(body.slug || "") || name);
  if (!slug) return { ok: false, error: "Slug is invalid" };

  const status = PRODUCT_STATUSES.includes(body.status as never) ? body.status : undefined;
  const variant = PRODUCT_VARIANTS.includes(body.variant as never) ? body.variant : undefined;

  const categoryIds = Array.isArray(body.categoryIds)
    ? (body.categoryIds as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 20)
    : [];
  const brandId = typeof body.brandId === "string" && body.brandId ? body.brandId : null;
  const imageAssetIds = Array.isArray(body.imageAssetIds)
    ? (body.imageAssetIds as unknown[])
        .filter((x): x is string => typeof x === "string" && x.startsWith("image-"))
        .slice(0, 12)
    : [];

  return {
    ok: true,
    doc: {
      name,
      slug: { _type: "slug", current: slug },
      description: String(body.description || "").slice(0, 2000),
      price,
      discount,
      stock,
      status,
      variant,
      isFeatured: Boolean(body.isFeatured),
      categories: categoryIds.map((id) => ({ _key: key(), _type: "reference", _ref: id })),
      brand: brandId ? { _type: "reference", _ref: brandId } : undefined,
      images: imageAssetIds.map((id) => ({
        _key: key(),
        _type: "image",
        asset: { _type: "reference", _ref: id },
      })),
    },
  };
}
