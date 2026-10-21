import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { writeAuditLog } from "@/lib/auditLog";
import { restoreOrderStock } from "@/lib/stock";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/client";
import { revalidatePath } from "next/cache";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // Admin rights require a Clerk-verified admin email
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10") || 10, 1), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0") || 0, 0);
    const status = searchParams.get("status") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    // Values go in as GROQ params; sort field/direction are whitelisted
    const SORTABLE = ["orderDate", "_createdAt", "totalPrice", "status", "orderNumber"];
    const sortBy = SORTABLE.includes(searchParams.get("sortBy") || "") ? searchParams.get("sortBy")! : "orderDate";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Build filter conditions
    const filterConditions = [];
    const queryParams: Record<string, string> = {};
    if (status) {
      filterConditions.push(`status == $status`);
      queryParams.status = status;
    }
    if (paymentMethod) {
      filterConditions.push(`paymentMethod == $paymentMethod`);
      queryParams.paymentMethod = paymentMethod;
    }

    // Build GROQ query
    const query = `
      *[_type == "order"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }] | order(${sortBy} ${sortOrder}) [${offset}...${offset + limit}] {
        _id,
        _createdAt,
        orderNumber,
        customerName,
        email,
        totalPrice,
        currency,
        status,
        paymentMethod,
        paymentStatus,
        orderDate,
        address,
        products[] {
          _key,
          quantity,
          product-> {
            _id,
            name,
            price,
            image
          }
        },
        subtotal,
        tax,
        shipping,
        amountDiscount,
        cancellationRequested,
        cancellationRequestedAt,
        cancellationRequestReason
      }
    `;

    // Get count query
    const countQuery = `
      count(*[_type == "order"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }])
    `;

    // Execute queries with perspective 'published' to avoid draft content
    const [orders, totalCount] = await Promise.all([
      client.fetch(query, queryParams, { cache: "no-store", next: { revalidate: 0 } }),
      client.fetch(
        countQuery,
        queryParams,
        { cache: "no-store", next: { revalidate: 0 } }
      ),
    ]);

    return NextResponse.json(
      {
        orders,
        totalCount,
        hasNextPage: offset + limit < totalCount,
        pagination: {
          limit,
          offset,
          total: totalCount,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete orders (single or bulk)
export async function DELETE(req: NextRequest) {
  try {
    // Admin rights require a Clerk-verified admin email
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const body = await req.json();
    const { orderIds } = body; // Array of order IDs to delete

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Order IDs array is required" },
        { status: 400 }
      );
    }

    // Only real order documents can be deleted from here
    const requestedIds = orderIds.filter((x: unknown): x is string => typeof x === "string").slice(0, 200);
    const existing = await writeClient.fetch<
      { _id: string; orderNumber?: string; status?: string; paymentStatus?: string; totalPrice?: number }[]
    >(
      `*[_type == "order" && _id in $ids]{ _id, orderNumber, status, paymentStatus, totalPrice }`,
      { ids: requestedIds }
    );
    const byId = new Map(existing.map((o) => [o._id, o]));

    // Delete orders from Sanity
    const deleteResults = [];
    for (const orderIdToDelete of requestedIds) {
      const snapshot = byId.get(orderIdToDelete);
      if (!snapshot) {
        deleteResults.push({ orderId: orderIdToDelete, success: false, error: "Order not found" });
        continue;
      }
      try {
        // Give back any stock / coupon use the order still holds before it disappears
        await restoreOrderStock(orderIdToDelete);
        await writeClient.delete(orderIdToDelete);
        deleteResults.push({ orderId: orderIdToDelete, success: true });
        await writeAuditLog({
          actorClerkId: admin.userId,
          actorEmail: admin.email,
          actorRole: "admin",
          action: "order.delete",
          targetId: orderIdToDelete,
          targetType: "order",
          before: { ...snapshot },
          after: null,
        });
      } catch (error) {
        console.error(`Failed to delete order ${orderIdToDelete}:`, error);
        deleteResults.push({
          orderId: orderIdToDelete,
          success: false,
          error: "Could not delete this order",
        });
      }
    }

    const successCount = deleteResults.filter((r) => r.success).length;
    const failureCount = deleteResults.filter((r) => !r.success).length;

    // Revalidate admin orders page to clear cache
    if (successCount > 0) {
      try {
        revalidatePath("/admin/orders", "page");
        revalidatePath("/api/admin/orders", "page");
      } catch (revalidateError) {
        console.error("Error revalidating paths:", revalidateError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully deleted ${successCount} order(s)${
          failureCount > 0 ? `, failed to delete ${failureCount}` : ""
        }`,
        results: deleteResults,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error deleting orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
