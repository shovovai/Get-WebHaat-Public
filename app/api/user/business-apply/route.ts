import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeClient, client } from "@/sanity/lib/client";
import { getCurrentUserEmail } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The applicant is always the signed-in user, never an email from the request
    const email = await getCurrentUserEmail();
    if (!email) {
      return NextResponse.json({ error: "Please verify your email address first" }, { status: 400 });
    }

    // Check if user exists in Sanity
    const existingUser = await client.fetch(
      `*[_type == "userType" && email == $email][0]`,
      { email }
    );

    // Allow business account applications for all registered users.
    if (!existingUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check business account status
    if (existingUser.businessStatus === "rejected") {
      return NextResponse.json(
        {
          error:
            "Business account application was rejected. Please contact admin for assistance.",
        },
        { status: 400 }
      );
    }

    if (existingUser.businessStatus === "pending") {
      return NextResponse.json(
        { error: "Business account application is already pending approval." },
        { status: 400 }
      );
    }

    if (existingUser.isBusiness) {
      return NextResponse.json(
        { error: "Business account already approved" },
        { status: 400 }
      );
    }

    // Apply for business account
    const result = await writeClient
      .patch(existingUser._id)
      .set({
        businessStatus: "pending",
        businessAppliedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message:
        "🚀 Business account application submitted successfully! Your application is under review and you'll enjoy 2% additional discount once approved.",
      user: result,
    });
  } catch (error) {
    console.error("Error applying for business account:", error);
    return NextResponse.json(
      { error: "Failed to submit business account application" },
      { status: 500 }
    );
  }
}
