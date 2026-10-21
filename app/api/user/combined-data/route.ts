import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Combined API endpoint to fetch all user data in a single request
 * Optimized for Next.js 16 and React 19
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all data in parallel (uncached — badges must be current)
    const [user, orders] = await Promise.all([
      backendClient.fetch(
        `*[_type == "user" && clerkUserId == $userId][0]{
          _id,
          email,
          role,
          "isEmployee": isEmployee == true && !(employeeStatus in ["inactive", "suspended"]),
          walletBalance,
          "unread": count(notifications[read != true])
        }`,
        { userId }
      ),
      backendClient.fetch<number>(`count(*[_type == "order" && clerkUserId == $userId])`, { userId }),
    ]);

    return NextResponse.json(
      {
        user: user || null,
        ordersCount: orders || 0,
        isEmployee: user?.isEmployee || false,
        unreadNotifications: user?.unread || 0,
        walletBalance: user?.walletBalance || 0,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching combined user data:", error);
    return NextResponse.json(
      {
        user: null,
        ordersCount: 0,
        isEmployee: false,
        unreadNotifications: 0,
        walletBalance: 0,
      },
      { status: 200 }
    );
  }
}
