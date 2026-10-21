import "server-only";
import { writeClient } from "@/sanity/lib/client";
import { isValidEmail } from "@/lib/html";
import { privateId } from "@/lib/privateId";

/*
 * Newsletter subscribe/unsubscribe. Server-only on purpose (NOT a "use server" action file):
 * these take any email address, so they must only be reached through the API routes
 * (/api/newsletter/*), which add rate limiting, bot checks and the signed unsubscribe token.
 */

interface SubscriptionData {
  email: string;
  source?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  message: string;
  data?: { subscriptionId?: string; email?: string; reactivated?: boolean };
  alreadySubscribed?: boolean;
}

const ALREADY =
  "You're already subscribed to our newsletter! Check your inbox for our latest updates.";

/** Subscribe an email; reactivates a previous unsubscribe instead of creating a duplicate. */
export async function subscribeToNewsletter(
  subscriptionData: SubscriptionData
): Promise<SubscriptionResponse> {
  try {
    const { source = "footer", ipAddress, userAgent } = subscriptionData;
    const email = String(subscriptionData.email || "").toLowerCase().trim();

    if (!isValidEmail(email)) {
      return { success: false, message: "Please provide a valid email address" };
    }

    // writeClient: no CDN, so a just-created subscription is seen immediately
    const existing = await writeClient.fetch<{ _id: string; status?: string } | null>(
      `*[_type == "subscription" && email == $email][0]{ _id, status }`,
      { email }
    );

    if (existing) {
      if (existing.status === "unsubscribed") {
        await writeClient
          .patch(existing._id)
          .set({ status: "active", subscribedAt: new Date().toISOString(), unsubscribedAt: null })
          .commit();
        return {
          success: true,
          message: "Welcome back! You've been successfully resubscribed to our newsletter.",
          data: { reactivated: true },
        };
      }
      return { success: false, message: ALREADY, alreadySubscribed: true };
    }

    const created = await writeClient.create({
      _id: privateId("subscription"),
      _type: "subscription",
      email,
      status: "active",
      subscribedAt: new Date().toISOString(),
      source: String(source).slice(0, 50),
      ipAddress: ipAddress || "unknown",
      userAgent: userAgent || "unknown",
    });

    return {
      success: true,
      message: "Thank you for subscribing! Check your email for a welcome message.",
      data: { subscriptionId: created._id, email },
    };
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    return { success: false, message: "Something went wrong. Please try again later." };
  }
}

/** Unsubscribe an email. Callers must first prove the caller controls it. */
export async function unsubscribeFromNewsletter(email: string): Promise<SubscriptionResponse> {
  try {
    const subscription = await writeClient.fetch<{ _id: string } | null>(
      `*[_type == "subscription" && email == $email && status == "active"][0]{ _id }`,
      { email: email.toLowerCase().trim() }
    );

    if (!subscription) {
      return { success: false, message: "Email not found in our subscription list" };
    }

    await writeClient
      .patch(subscription._id)
      .set({ status: "unsubscribed", unsubscribedAt: new Date().toISOString() })
      .commit();

    return { success: true, message: "You have been successfully unsubscribed from our newsletter" };
  } catch (error) {
    console.error("Error unsubscribing from newsletter:", error);
    return { success: false, message: "Failed to unsubscribe. Please try again." };
  }
}
