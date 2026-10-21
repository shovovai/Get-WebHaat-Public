import { NextRequest, NextResponse } from "next/server";
import { unsubscribeFromNewsletter } from "@/lib/newsletter";
import { getCurrentUserEmail } from "@/lib/adminAuth";
import { isValidEmail } from "@/lib/html";
import { limitRequest } from "@/lib/rateLimit";
import { verifyUnsubscribeToken } from "@/lib/unsubscribeToken";

// Allowed when the request carries the signed token from our emails,
// or when a signed-in user unsubscribes their own verified address.
export async function POST(request: NextRequest) {
  const limited = await limitRequest(request, "unsubscribe", { limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const ownEmail = await getCurrentUserEmail().catch(() => null);
    if (ownEmail !== email && !verifyUnsubscribeToken(email, body.token)) {
      return NextResponse.json(
        {
          error:
            "Please use the unsubscribe link from one of our emails, or sign in and manage it from your profile.",
        },
        { status: 403 }
      );
    }

    const result = await unsubscribeFromNewsletter(email);

    // Same answer whether or not the address was subscribed
    return NextResponse.json(
      { message: result.success ? result.message : "You're unsubscribed. You won't receive newsletter emails." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Newsletter unsubscribe API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
