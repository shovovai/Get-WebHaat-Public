import { NextRequest, NextResponse } from "next/server";
import { client, writeClient } from "@/sanity/lib/client";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  try {
    // Verified Clerk email only, never the email stored in Sanity
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    // Find all subscriptions
    const allSubscriptions = await client.fetch(
      `*[_type == "subscription"] | order(subscribedAt asc) {
        _id,
        email,
        status,
        subscribedAt
      }`
    );

    // Group by email (normalized)
    const emailGroups: Record<string, any[]> = {};

    allSubscriptions.forEach((sub: any) => {
      const normalizedEmail = sub.email.toLowerCase().trim();
      if (!emailGroups[normalizedEmail]) {
        emailGroups[normalizedEmail] = [];
      }
      emailGroups[normalizedEmail].push(sub);
    });

    // Find duplicates and delete all except the first one
    const duplicatesToDelete: string[] = [];
    const duplicateEmails: string[] = [];

    Object.entries(emailGroups).forEach(([email, subs]) => {
      if (subs.length > 1) {
        duplicateEmails.push(email);
        // Keep the first subscription (oldest), delete the rest
        for (let i = 1; i < subs.length; i++) {
          duplicatesToDelete.push(subs[i]._id);
        }
      }
    });

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      const deletePromises = duplicatesToDelete.map((id) =>
        writeClient.delete(id)
      );
      await Promise.all(deletePromises);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Cleanup completed successfully`,
        duplicatesFound: duplicateEmails.length,
        duplicatesRemoved: duplicatesToDelete.length,
        affectedEmails: duplicateEmails,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
    return NextResponse.json(
      { error: "Failed to cleanup duplicates" },
      { status: 500 }
    );
  }
}
