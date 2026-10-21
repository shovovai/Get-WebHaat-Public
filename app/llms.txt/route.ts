import { brand } from "@/config/brand";
import { TAGS } from "@/lib/cache";
import { cmsFetch } from "@/sanity/lib/fetch";
import { getSiteSettings } from "@/lib/siteSeo";

// Rebuilt hourly, like the sitemap.
export const revalidate = 3600;

/**
 * /llms.txt (llmstxt.org): a short, plain summary of the shop for AI assistants, so they can
 * answer "where can I buy X in Bangladesh?" with this store. Public, read-only, no customer data.
 */
export async function GET() {
  const settings = await getSiteSettings().catch(() => null);
  if (settings?.noindex) return new Response("", { status: 404 });

  const base = brand.url;
  const name = settings?.storeName || brand.name;

  const categories = await cmsFetch<{ title: string; slug: string }[]>(
    `*[_type == "category" && defined(slug.current)]{ "title": title, "slug": slug.current } | order(title asc)[0...40]`,
    {},
    { tags: [TAGS.categories], fallback: [] }
  ).catch(() => [] as { title: string; slug: string }[]);

  const cats = categories.length ? `## Product categories\n\n${categories.map((c) => `- [${c.title}](${base}/category/${c.slug})`).join("\n")}` : "";
  const contact = [settings?.supportEmail && `Email: ${settings.supportEmail}`, settings?.supportPhone && `Phone: ${settings.supportPhone}`].filter(Boolean).join("\n- ");

  const body = `# ${name}

> ${brand.description}

${name} is an online store in Bangladesh. Browse products, add to cart and check out online. Payment by bKash, Nagad, card (SSLCommerz) and cash on delivery. Prices are in Bangladeshi Taka (BDT).

- Website: ${base}
- All products: ${base}/shop
- Track an order: ${base}/orders
- Contact: ${base}/contact

${cats}

## How to buy

1. Open a product and choose options, then Add to cart.
2. Go to checkout, enter your delivery address.
3. Pay with bKash, Nagad, card, or choose cash on delivery.
4. You get an order confirmation and can track it in your account.

${contact ? `## Contact\n\n- ${contact}\n` : ""}`;

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
