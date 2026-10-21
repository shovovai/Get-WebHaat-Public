import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";

export const dynamic = "force-dynamic";

// Categories + brands for the product editor dropdowns
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const data = await backendClient.fetch(`{
    "categories": *[_type == "category"] | order(title asc){ _id, title },
    "brands": *[_type == "brand"] | order(title asc){ _id, title }
  }`);
  return NextResponse.json({ success: true, ...data });
}
