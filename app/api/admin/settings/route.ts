import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/adminAuth";
import { backendClient } from "@/sanity/lib/backendClient";
import {
  DEFAULT_STORE_SETTINGS,
  EDITABLE_SETTINGS_KEYS,
  STORE_SETTINGS_ID,
  getStoreSettings,
  SETTINGS_PATTERNS,
  URL_SETTINGS,
} from "@/lib/storeSettings";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const settings = await getStoreSettings({ fresh: true });
  return NextResponse.json({ success: true, settings });
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const body = (await request.json()) as Record<string, unknown>;
    const update: Record<string, unknown> = {};

    // Only accept known keys with the same primitive type as the default
    for (const key of EDITABLE_SETTINGS_KEYS) {
      if (!(key in body)) continue;
      const value = body[key];
      const expected = typeof DEFAULT_STORE_SETTINGS[key];
      if (typeof value !== expected) {
        return NextResponse.json(
          { success: false, error: `Invalid value for ${key}` },
          { status: 400 }
        );
      }
      if (typeof value === "number" && !(Number.isFinite(value) && value >= 0 && value <= 1_000_000_000)) {
        return NextResponse.json(
          { success: false, error: `${key} must be 0 or more` },
          { status: 400 }
        );
      }
      update[key] =
        typeof value === "string"
          ? value.trim()
          : typeof value === "number"
            ? Math.round(value * 100) / 100
            : value;
    }

    // Format checks for values that end up in meta / script tags
    for (const [key, pattern] of Object.entries(SETTINGS_PATTERNS)) {
      const v = update[key];
      if (typeof v === "string" && v && !pattern!.test(v)) {
        return NextResponse.json(
          { success: false, error: `"${v}" is not a valid value for ${key}` },
          { status: 400 }
        );
      }
    }
    for (const key of URL_SETTINGS) {
      const v = update[key];
      if (typeof v === "string" && v && !/^https?:\/\/[^\s"<>]+$/i.test(v)) {
        return NextResponse.json(
          { success: false, error: `${key} must be a full URL starting with https://` },
          { status: 400 }
        );
      }
    }
    if (typeof update.twitterHandle === "string" && update.twitterHandle && !update.twitterHandle.startsWith("@")) {
      update.twitterHandle = "@" + update.twitterHandle;
    }

    await backendClient.createIfNotExists({
      _id: STORE_SETTINGS_ID,
      _type: "storeSettings",
    });
    await backendClient
      .patch(STORE_SETTINGS_ID)
      .set({
        ...update,
        updatedAt: new Date().toISOString(),
        // storeSettings is a PUBLIC document (anyone can read it): never store the admin's email here
        updatedBy: admin.userId,
      })
      .commit();

    revalidateTag("storeSettings", { expire: 0 });

    return NextResponse.json({
      success: true,
      settings: await getStoreSettings({ fresh: true }),
    });
  } catch (error) {
    console.error("Error saving store settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
