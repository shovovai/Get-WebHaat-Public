import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { verifiedPrimaryEmail } from "@/lib/adminAuth";
import { privateId } from "@/lib/privateId";

// An address belongs to the signed-in user when it references their Sanity user document
// (found by Clerk user id), or when it carries their VERIFIED email. Unverified emails never count.
const OWNED_ADDRESS = `_type == "address" && (
  user._ref in *[_type == "user" && clerkUserId == $clerkUserId]._id ||
  ($email != "" && email == $email)
)`;

export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Fetch this user's addresses (by Clerk user id or verified email)
    const addresses = await backendClient.fetch(
      `*[${OWNED_ADDRESS}] | order(default desc, createdAt desc) {
        _id,
        name,
        email,
        phone,
        address,
        city,
        state,
        zip,
        country,
        default,
        type,
        createdAt
      }`,
      { clerkUserId: userId, email: verifiedPrimaryEmail(user) ?? "" }
    );

    return NextResponse.json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      address,
      city,
      state,
      zip,
      country,
      countryCode,
      stateCode,
      subArea,
      default: isDefault,
      type,
      phone,
    } = body;

    // Validate required fields
    if (!name || !address || !city || !state || !zip) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const verifiedEmail = verifiedPrimaryEmail(user) ?? "";

    // First, ensure the user exists in Sanity
    let sanityUser = await backendClient.fetch(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
      { clerkUserId: userId }
    );

    if (!sanityUser) {
      // Create user if doesn't exist
      sanityUser = await backendClient.create({
        _id: privateId("user"),
        _type: "user",
        clerkUserId: userId,
        email: verifiedEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: new Date().toISOString(),
      });
    }

    // If this is set as default, unset all other default addresses for this user
    if (isDefault) {
      const existingAddresses = await backendClient.fetch(
        `*[${OWNED_ADDRESS} && default == true]`,
        { clerkUserId: userId, email: verifiedEmail }
      );

      for (const existingAddress of existingAddresses) {
        await backendClient
          .patch(existingAddress._id)
          .set({ default: false })
          .commit();
      }
    }

    // Create new address
    const newAddress = await backendClient.create({
      _id: privateId("address"),
      _type: "address",
      name,
      email: verifiedEmail,
      address,
      city,
      state,
      zip,
      country: country || "",
      countryCode: countryCode || "",
      stateCode: stateCode || "",
      subArea: subArea || "",
      default: isDefault || false,
      type: type || "home",
      phone: phone || null,
      user: {
        _type: "reference",
        _ref: sanityUser._id,
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      addressId: newAddress._id,
      message: "Address created successfully",
    });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      _id,
      name,
      address,
      city,
      state,
      zip,
      country,
      countryCode,
      stateCode,
      subArea,
      default: isDefault,
      type,
      phone,
    } = body;

    if (!_id) {
      return NextResponse.json(
        { error: "Address ID is required for update" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!name || !address || !city || !state || !zip) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const owner = { clerkUserId: userId, email: verifiedPrimaryEmail(user) ?? "" };

    // Only an address that belongs to this user can be changed
    const owned = await backendClient.fetch<string | null>(
      `*[${OWNED_ADDRESS} && _id == $id][0]._id`,
      { ...owner, id: String(_id) }
    );
    if (!owned) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // If this is set as default, unset all other default addresses for this user
    if (isDefault) {
      const existingAddresses = await backendClient.fetch(
        `*[${OWNED_ADDRESS} && _id != $currentId]`,
        { ...owner, currentId: owned }
      );

      for (const existingAddress of existingAddresses) {
        await backendClient
          .patch(existingAddress._id)
          .set({ default: false })
          .commit();
      }
    }

    // Update the address
    const updatedAddress = await backendClient
      .patch(owned)
      .set({
        name,
        address,
        city,
        state,
        zip,
        country: country || "",
        countryCode: countryCode || "",
        stateCode: stateCode || "",
        subArea: subArea || "",
        default: isDefault || false,
        type: type || "home",
        phone: phone || null,
        updatedAt: new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      address: updatedAddress,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get("id");

    if (!addressId) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    // Only an address that belongs to this user can be deleted
    const owned = await backendClient.fetch<string | null>(
      `*[${OWNED_ADDRESS} && _id == $id][0]._id`,
      { clerkUserId: userId, email: verifiedPrimaryEmail(user) ?? "", id: addressId }
    );
    if (!owned) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Drop the reference from the user profile first, then the address itself
    const userDoc = await backendClient.fetch<string | null>(
      `*[_type == "user" && clerkUserId == $userId && $id in addresses[]._ref][0]._id`,
      { userId, id: owned }
    );
    const tx = backendClient.transaction();
    if (userDoc) tx.patch(userDoc, (p) => p.unset([`addresses[_ref == "${owned}"]`]));
    tx.delete(owned);
    await tx.commit();

    return NextResponse.json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
