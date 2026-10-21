import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  try {
    // Verified Clerk email only, never the email stored in Sanity
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    // Fetch all subscriptions
    const subscriptions = await client.fetch(
      `*[_type == "subscription"] | order(subscribedAt desc) {
        _id,
        email,
        status,
        subscribedAt,
        unsubscribedAt,
        source,
        ipAddress,
        userAgent
      }`
    );

    return NextResponse.json(
      {
        subscriptions,
        total: subscriptions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
