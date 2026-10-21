import { NextRequest, NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { rateLimit } from "@/lib/rateLimit";

// Fixed, read-only catalog queries used by browser components (search, shop
// filters, category pages). Only product / category / brand data can be
// returned — callers choose an action, never write GROQ themselves.

const PRODUCT_PROJECTION = `{..., "categories": categories[]->title, brand->{_id, title}}`;

const QUERIES = {
  featured: `*[_type == "product" && isFeatured == true] | order(name asc)[0...12]`,
  search: `*[_type == "product" && (name match $search || description match $search)] | order(name asc)[0...30]`,
  shop: `*[_type == "product"
      && (!defined($selectedCategory) || references(*[_type == "category" && slug.current == $selectedCategory]._id))
      && (!defined($selectedBrand) || references(*[_type == "brand" && slug.current == $selectedBrand]._id))
      && price >= $minPrice && price <= $maxPrice
      && (!defined($search) || name match $search || description match $search)
    ] | order(name asc) ${PRODUCT_PROJECTION}`,
} as const;

type Action = keyof typeof QUERIES;

const str = (v: unknown, max = 100) => (typeof v === "string" ? v.slice(0, max) : null);
const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

function paramsFor(action: Action, p: Record<string, unknown>) {
  switch (action) {
    case "search": {
      const term = (str(p.search, 60) || "").replace(/[*"\\]/g, "").trim();
      return term ? { search: `${term}*` } : null;
    }
    case "shop": {
      const term = (str(p.search, 60) || "").replace(/[*"\\]/g, "").trim();
      return {
        search: term ? `${term}*` : null,
        selectedCategory: str(p.selectedCategory),
        selectedBrand: str(p.selectedBrand),
        minPrice: num(p.minPrice, 0),
        maxPrice: num(p.maxPrice, 1_000_000_000),
      };
    }
    default:
      return {};
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "catalog", { limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    const action = body?.action as Action;
    if (!action || !(action in QUERIES)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const params = paramsFor(action, body.params || {});
    if (!params) return NextResponse.json({ result: [] });

    const result = await client.fetch(QUERIES[action], params);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("catalog query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
