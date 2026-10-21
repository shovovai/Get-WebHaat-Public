import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { releaseExpiredReservations } from "@/lib/stock";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
// Puts stock held by unpaid online orders whose reservation expired back on sale.
// The same release also runs opportunistically whenever a new order is placed, so
// a daily schedule (the Vercel Hobby limit) is only the safety net.

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  // Hash both sides so the comparison is constant-time and length-independent
  const a = crypto.createHash("sha256").update(header).digest();
  const b = crypto.createHash("sha256").update(`Bearer ${secret}`).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    let released = 0;
    // A few batches so a backlog clears in one run
    for (let i = 0; i < 5; i++) {
      const n = await releaseExpiredReservations(50);
      released += n;
      if (n < 50) break;
    }
    return NextResponse.json({ ok: true, released });
  } catch (error) {
    console.error("Releasing expired stock reservations failed:", error);
    return NextResponse.json({ ok: false, error: "Release failed" }, { status: 500 });
  }
}
