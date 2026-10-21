/**
 * Fills the store with a decorated demo shop: categories, products and homepage banners, all with
 * real topical images. Use it to make the demo look like a real shop instead of a WebHaat advert.
 *
 * Run (from the repo root, with the same env the app uses — needs a write token):
 *   SANITY_API_TOKEN=... npx tsx scripts/seed-demo.ts            # add/replace the demo content
 *   SANITY_API_TOKEN=... npx tsx scripts/seed-demo.ts --reset    # also delete ALL existing banners first
 *
 * It is idempotent: every doc has a fixed `demo-*` id, so running it again just updates them.
 * Ids are dot-free on purpose: on Sanity's free plan (public dataset) a doc whose _id contains a
 * dot is hidden from tokenless reads, so the storefront would never see it.
 * `--reset` additionally removes every banner document (your old WebHaat banners) before seeding.
 * It never touches orders, users or settings.
 */
import { backendClient } from "../sanity/lib/backendClient";

// Load env the same way the other scripts do: dotenv if present, else Node's built-in loader.
async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const name = "dotenv";
      const dotenv = (await import(name)) as { config: (o: { path: string }) => unknown };
      dotenv.config({ path: file });
    } catch {
      try {
        process.loadEnvFile(file);
      } catch {
        /* file missing — fine */
      }
    }
  }
}

const RESET = process.argv.includes("--reset");

type Cat = { id: string; title: string; slug: string; img: string };
type Prod = {
  id: string;
  name: string;
  slug: string;
  price: number;
  discount?: number;
  stock: number;
  status?: "new" | "hot" | "sale";
  variant: "gadget" | "appliances" | "refrigerators" | "others";
  featured?: boolean;
  cat: string;
  desc: string;
  img: string;
};

// Topical, stable images (loremflickr locks an image per number, so a slug always gets the same one).
const pic = (keyword: string, lock: number) => `https://loremflickr.com/900/900/${encodeURIComponent(keyword)}?lock=${lock}`;

const CATEGORIES: Cat[] = [
  { id: "demo-cat-electronics", title: "Electronics", slug: "electronics", img: pic("electronics,gadget", 11) },
  { id: "demo-cat-fashion", title: "Fashion", slug: "fashion", img: pic("fashion,clothing", 12) },
  { id: "demo-cat-home", title: "Home & Kitchen", slug: "home-kitchen", img: pic("home,kitchen", 13) },
  { id: "demo-cat-beauty", title: "Beauty & Care", slug: "beauty-care", img: pic("beauty,cosmetics", 14) },
];

const PRODUCTS: Prod[] = [
  { id: "demo-prod-earbuds", name: "Wireless Earbuds Pro", slug: "wireless-earbuds-pro", price: 2490, discount: 20, stock: 40, status: "hot", variant: "gadget", featured: true, cat: "demo-cat-electronics", desc: "Noise-cancelling earbuds with 30-hour battery and fast charge.", img: pic("earbuds", 101) },
  { id: "demo-prod-smartwatch", name: "Smart Watch Series 6", slug: "smart-watch-series-6", price: 3990, discount: 15, stock: 25, status: "new", variant: "gadget", featured: true, cat: "demo-cat-electronics", desc: "Heart-rate, SpO2, calls and a bright always-on display.", img: pic("smartwatch", 102) },
  { id: "demo-prod-speaker", name: "Portable Bluetooth Speaker", slug: "portable-bluetooth-speaker", price: 1790, stock: 50, status: "sale", variant: "gadget", cat: "demo-cat-electronics", desc: "Punchy bass, waterproof, 12 hours of play.", img: pic("speaker", 103) },
  { id: "demo-prod-powerbank", name: "20000mAh Power Bank", slug: "20000mah-power-bank", price: 1450, discount: 10, stock: 60, variant: "gadget", cat: "demo-cat-electronics", desc: "Fast-charge two devices at once, slim metal body.", img: pic("powerbank,battery", 104) },
  { id: "demo-prod-tshirt", name: "Premium Cotton T-Shirt", slug: "premium-cotton-tshirt", price: 650, discount: 25, stock: 120, status: "sale", variant: "others", featured: true, cat: "demo-cat-fashion", desc: "Soft combed cotton, keeps its shape wash after wash.", img: pic("tshirt", 105) },
  { id: "demo-prod-sneakers", name: "Everyday Sneakers", slug: "everyday-sneakers", price: 2290, stock: 35, status: "new", variant: "others", cat: "demo-cat-fashion", desc: "Lightweight, breathable and comfortable all day.", img: pic("sneakers,shoes", 106) },
  { id: "demo-prod-backpack", name: "Urban Laptop Backpack", slug: "urban-laptop-backpack", price: 1890, discount: 15, stock: 45, variant: "others", cat: "demo-cat-fashion", desc: "Padded 15.6\" laptop sleeve, water-resistant, USB port.", img: pic("backpack", 107) },
  { id: "demo-prod-sunglasses", name: "Polarized Sunglasses", slug: "polarized-sunglasses", price: 890, stock: 70, variant: "others", cat: "demo-cat-fashion", desc: "UV400 polarized lenses with a lightweight frame.", img: pic("sunglasses", 108) },
  { id: "demo-prod-blender", name: "Compact Kitchen Blender", slug: "compact-kitchen-blender", price: 2150, discount: 10, stock: 30, status: "hot", variant: "appliances", featured: true, cat: "demo-cat-home", desc: "500W motor, glass jar, blends smoothies in seconds.", img: pic("blender,kitchen", 109) },
  { id: "demo-prod-lamp", name: "LED Study Desk Lamp", slug: "led-study-desk-lamp", price: 980, stock: 80, status: "new", variant: "appliances", cat: "demo-cat-home", desc: "Adjustable brightness, eye-care light, USB powered.", img: pic("desk,lamp", 110) },
  { id: "demo-prod-skincare", name: "Glow Skincare Set", slug: "glow-skincare-set", price: 1290, discount: 20, stock: 55, status: "sale", variant: "others", cat: "demo-cat-beauty", desc: "Cleanser, serum and moisturiser for daily glow.", img: pic("skincare,cosmetics", 111) },
  { id: "demo-prod-perfume", name: "Signature Perfume 50ml", slug: "signature-perfume-50ml", price: 1650, stock: 40, variant: "others", featured: true, cat: "demo-cat-beauty", desc: "Long-lasting fragrance for day and night.", img: pic("perfume", 112) },
];

const BANNERS = [
  { id: "demo-banner-sale", title: "Mega Eid Sale", description: "Up to 30% off across electronics, fashion and home. Limited time only.", badge: "30% OFF", discountAmount: 30, img: pic("shopping,sale", 201) },
  { id: "demo-banner-new", title: "New Arrivals", description: "Fresh gadgets and styles just landed. Be the first to grab them.", badge: "NEW", discountAmount: 0, img: pic("fashion,store", 202) },
  { id: "demo-banner-free", title: "Free Delivery in Dhaka", description: "Order over ৳2,000 and we deliver to your door, free.", badge: "FREE", discountAmount: 0, img: pic("delivery,parcel", 203) },
];

async function upload(url: string, label: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`image fetch failed (${res.status}) for ${label}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const asset = await backendClient.assets.upload("image", buf, { filename: `${label}.jpg` });
  return { _type: "image" as const, asset: { _type: "reference" as const, _ref: asset._id } };
}

async function main() {
  await loadEnv();
  if (!process.env.SANITY_API_TOKEN) throw new Error("SANITY_API_TOKEN is required (a write token). Set it in .env.local.");

  if (RESET) {
    const n = await backendClient.delete({ query: `*[_type == "banner"]` });
    console.log(`[seed-demo] removed existing banners (${Array.isArray(n?.results) ? n.results.length : "ok"})`);
  }

  console.log("[seed-demo] categories…");
  for (const c of CATEGORIES) {
    const image = await upload(c.img, c.slug);
    await backendClient.createOrReplace({ _id: c.id, _type: "category", title: c.title, slug: { _type: "slug", current: c.slug }, description: `Shop ${c.title.toLowerCase()} at great prices.`, featured: true, image });
  }

  console.log("[seed-demo] products…");
  for (const p of PRODUCTS) {
    const image = await upload(p.img, p.slug);
    await backendClient.createOrReplace({
      _id: p.id,
      _type: "product",
      name: p.name,
      slug: { _type: "slug", current: p.slug },
      images: [{ ...image, _key: `${p.id}-0` }],
      description: p.desc,
      price: p.price,
      discount: p.discount ?? 0,
      stock: p.stock,
      status: p.status,
      variant: p.variant,
      isFeatured: !!p.featured,
      categories: [{ _type: "reference", _ref: p.cat, _key: `${p.id}-cat` }],
    });
  }

  console.log("[seed-demo] banners…");
  for (const b of BANNERS) {
    const image = await upload(b.img, b.id);
    await backendClient.createOrReplace({ _id: b.id, _type: "banner", title: b.title, description: b.description, badge: b.badge, discountAmount: b.discountAmount, image });
  }

  console.log(`[seed-demo] done: ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ${BANNERS.length} banners.`);
}

main().catch((e) => {
  console.error("[seed-demo] failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
