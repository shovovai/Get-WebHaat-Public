import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { verifiedPrimaryEmail } from "@/lib/adminAuth";
import { limitRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const FINISHED = ["delivered", "cancelled", "completed", "refunded"];

/**
 * Deletes the signed-in customer's account:
 * - removes their login (Clerk), saved addresses and newsletter subscription
 * - clears personal details from their profile
 * Past orders are kept (with the details printed on them) for accounting.
 */
export async function DELETE(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await limitRequest(request, "delete-account", { limit: 3, windowMs: 60 * 60_000 }, userId);
  if (limited) return limited;

  try {
    const email = verifiedPrimaryEmail(await currentUser());

    const [openOrders, user] = await Promise.all([
      backendClient.fetch<number>(
        `count(*[_type == "order" && clerkUserId == $userId && !(status in $finished)])`,
        { userId, finished: FINISHED }
      ),
      backendClient.fetch<{ _id: string; walletBalance?: number } | null>(
        `*[_type == "user" && clerkUserId == $userId][0]{ _id, walletBalance }`,
        { userId }
      ),
    ]);

    if (openOrders > 0) {
      return NextResponse.json(
        { error: "You have orders in progress. Please wait until they are delivered or cancelled." },
        { status: 409 }
      );
    }
    if ((user?.walletBalance ?? 0) > 0) {
      return NextResponse.json(
        { error: "Your wallet still has a balance. Please withdraw it or contact support first." },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const tx = backendClient.transaction();

    if (user) {
      tx.patch(user._id, (p) =>
        p
          .set({
            isActive: false,
            firstName: "Deleted",
            lastName: "customer",
            email: `deleted-${userId}@deleted.invalid`,
            deletedAt: now,
            updatedAt: now,
          })
          .unset(["phone", "dateOfBirth", "profileImage", "addresses", "wishlist", "cart", "notifications"])
      );
    }

    // Addresses linked to the profile or carrying the verified email; the subscription by email
    const [addressIds, subscriptionIds] = await Promise.all([
      backendClient.fetch<string[]>(
        `*[_type == "address" && ((defined($uid) && user._ref == $uid) || ($email != "" && email == $email))]._id`,
        { uid: user?._id ?? null, email: email ?? "" }
      ),
      email
        ? backendClient.fetch<string[]>(`*[_type == "subscription" && email == $email]._id`, { email })
        : Promise.resolve([] as string[]),
    ]);
    for (const id of [...addressIds, ...subscriptionIds]) tx.delete(id);

    await tx.commit();

    // Remove the login last, so a failure above leaves the account usable
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    return NextResponse.json({ success: true, message: "Your account has been deleted." });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "We couldn't delete your account. Please contact support." },
      { status: 500 }
    );
  }
}
