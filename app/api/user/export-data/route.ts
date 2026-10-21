import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { verifiedPrimaryEmail } from "@/lib/adminAuth";
import { limitRequest } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// "Download my data": everything the store keeps about the signed-in customer
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await limitRequest(request, "export-data", { limit: 5, windowMs: 60 * 60_000 }, userId);
  if (limited) return limited;

  try {
    const clerkUser = await currentUser();
    const email = verifiedPrimaryEmail(clerkUser);

    const [profile, orders, addresses, reviews, subscription] = await Promise.all([
      backendClient.fetch(
        `*[_type == "user" && clerkUserId == $userId][0]{
          firstName, lastName, email, phone, dateOfBirth, preferences,
          rewardPoints, loyaltyPoints, walletBalance, walletTransactions, withdrawalRequests,
          membershipType, premiumStatus, businessStatus, createdAt, updatedAt
        }`,
        { userId }
      ),
      backendClient.fetch(
        `*[_type == "order" && clerkUserId == $userId] | order(orderDate desc){
          orderNumber, orderDate, status, paymentStatus, paymentMethod, currency,
          subtotal, tax, shipping, amountDiscount, totalPrice, address,
          "items": products[]{ quantity, "name": product->name, "price": product->price }
        }`,
        { userId }
      ),
      backendClient.fetch(
        `*[_type == "address" && (user._ref in *[_type == "user" && clerkUserId == $userId]._id || ($email != "" && email == $email))]{ name, address, city, state, zip, default, createdAt }`,
        { userId, email: email ?? "" }
      ),
      backendClient.fetch(
        `*[_type == "review" && user->clerkUserId == $userId]{ rating, title, content, status, createdAt, "product": product->name }`,
        { userId }
      ),
      email
        ? backendClient.fetch(`*[_type == "subscription" && email == $email][0]{ status, subscribedAt }`, { email })
        : null,
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      account: {
        id: userId,
        email,
        firstName: clerkUser?.firstName,
        lastName: clerkUser?.lastName,
        createdAt: clerkUser?.createdAt ? new Date(clerkUser.createdAt).toISOString() : undefined,
      },
      profile,
      orders,
      addresses,
      reviews,
      newsletter: subscription,
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="my-data.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting user data:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
