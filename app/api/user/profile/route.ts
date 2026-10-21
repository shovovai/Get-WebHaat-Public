import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { getCurrentUserEmail } from "@/lib/adminAuth";
import { privateId } from "@/lib/privateId";

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const firstName = text(body.firstName, 60);
    const lastName = text(body.lastName, 60);
    const phone = text(body.phone, 30);
    const dateOfBirth = text(body.dateOfBirth, 10);

    if (phone && !/^[+\d][\d\s()-]{5,29}$/.test(phone)) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
    }
    if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      return NextResponse.json({ error: "Date of birth must be YYYY-MM-DD" }, { status: 400 });
    }

    const fields = { firstName, lastName, phone, dateOfBirth, updatedAt: new Date().toISOString() };

    // Always the signed-in user's own document — never an id from the request
    const existingUser = await backendClient.fetch<{ _id: string } | null>(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{ _id }`,
      { clerkUserId: userId }
    );

    if (existingUser) {
      await backendClient.patch(existingUser._id).set(fields).commit();
    } else {
      await backendClient.create({
        _id: privateId("user"),
        _type: "user",
        clerkUserId: userId,
        email: (await getCurrentUserEmail()) || "",
        ...fields,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: { firstName, lastName, phone, dateOfBirth },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
