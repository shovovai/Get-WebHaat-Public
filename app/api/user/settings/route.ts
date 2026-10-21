import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";

// Preferences the customer can change from Account → Settings
const KEYS = ["orderUpdates"] as const;
type Key = (typeof KEYS)[number];

async function getUserDoc(clerkUserId: string) {
  return backendClient.fetch<{ _id: string; preferences?: Partial<Record<Key, boolean>> } | null>(
    `*[_type == "user" && clerkUserId == $clerkUserId][0]{ _id, preferences }`,
    { clerkUserId }
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUserDoc(userId);
  return NextResponse.json({
    success: true,
    settings: { orderUpdates: user?.preferences?.orderUpdates !== false },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, boolean> = {};
    for (const key of KEYS) {
      if (typeof body[key] === "boolean") updates[`preferences.${key}`] = body[key];
    }
    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const user = await getUserDoc(userId);
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await backendClient
      .patch(user._id)
      .setIfMissing({ preferences: {} })
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .commit();

    return NextResponse.json({ success: true, message: "Settings updated successfully" });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
