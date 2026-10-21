import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { invalidateTags, tagsForDocument } from "@/lib/cache";

/**
 * Sanity GROQ-powered webhook → on-demand revalidation of cached pages.
 *
 * Set up in sanity.io/manage → API → Webhooks:
 *   URL:        https://<your-domain>/api/revalidate
 *   Trigger on: Create, Update, Delete      Dataset: production
 *   Filter:     _type in ["product","category","brand","blog","blogcategory","author",
 *               "banner","lookbook","review","storeSettings","paymentSettings"]
 *   Projection: {_id, _type, "slug": coalesce(slug.current, product->slug.current)}
 *   HTTP method: POST    API version: v2025-02-19    Drafts: off
 *   Secret:     same value as the SANITY_REVALIDATE_SECRET env var
 */

interface WebhookBody {
  _id?: string;
  _type?: string;
  slug?: string | null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) {
    console.error("SANITY_REVALIDATE_SECRET is not set; refusing webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  try {
    // Verifies the signature and waits for Content Lake consistency so the
    // regenerated pages read the new content
    const { isValidSignature, body } = await parseBody<WebhookBody>(req, secret, true);
    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    if (!body?._type) {
      return NextResponse.json({ error: "Missing _type" }, { status: 400 });
    }

    const tags = tagsForDocument(body._type, body.slug);
    invalidateTags(tags);
    return NextResponse.json({ revalidated: tags.length > 0, tags, now: Date.now() });
  } catch (error) {
    console.error("Revalidate webhook failed:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
