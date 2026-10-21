import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { auth } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/client";

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId, approve, adminEmail, reason } = await request.json();

    if (!accountId || typeof approve !== "boolean" || !adminEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (approve) {
      // Approve the premium account
      const result = await writeClient
        .patch(accountId)
        .set({
          isActive: true,
          premiumStatus: "active",
          membershipType: "premium",
          premiumApprovedBy: adminEmail,
          premiumApprovedAt: new Date().toISOString(),
          loyaltyPoints: 100, // Welcome bonus
          updatedAt: new Date().toISOString(),
        })
        .commit();

      return NextResponse.json({
        success: true,
        message: "Premium account approved successfully",
        account: result,
      });
    } else {
      // Reject the premium account
      const result = await writeClient
        .patch(accountId)
        .set({
          isActive: false,
          premiumStatus: "rejected",
          premiumApprovedBy: adminEmail,
          premiumApprovedAt: new Date().toISOString(),
          rejectionReason: reason || "No reason provided",
          updatedAt: new Date().toISOString(),
        })
        .commit();

      return NextResponse.json({
        success: true,
        message: "Premium account rejected",
        account: result,
      });
    }
  } catch (error) {
    console.error("Error updating premium account:", error);
    return NextResponse.json(
      { error: "Failed to update premium account" },
      { status: 500 }
    );
  }
}
