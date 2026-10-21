"use server";

import { client } from "@/sanity/lib/client";
import { getCurrentUserEmail } from "@/lib/adminAuth";

// Every export of a "use server" file is a public endpoint. Subscribe/unsubscribe take an
// arbitrary email, so they live in lib/newsletter.ts (server-only) behind /api/newsletter/*.

/**
 * Is the signed-in user's own email subscribed?
 * (Takes no email argument, so it can't be used to probe other addresses.)
 */
export async function checkSubscriptionStatus(): Promise<{ subscribed: boolean; status?: string }> {
  try {
    const email = await getCurrentUserEmail();
    if (!email) return { subscribed: false };

    const subscription = await client.fetch(
      `*[_type == "subscription" && email == $email][0]{ status }`,
      { email }
    );

    if (!subscription) {
      return { subscribed: false };
    }

    return {
      subscribed: subscription.status === "active",
      status: subscription.status,
    };
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return { subscribed: false };
  }
}
