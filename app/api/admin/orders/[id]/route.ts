import { restoreOrderStock } from "@/lib/stock";
import { formatPrice } from "@/lib/storeConfig";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { writeAuditLog } from "@/lib/auditLog";
import { diffFields, isRevisionConflict } from "@/lib/orderGuards";
import { writeClient } from "@/sanity/lib/client";
import { sendOrderStatusNotification } from "@/lib/notificationService";
import { addWalletCredit } from "@/lib/walletCredit";

// Fields an admin may change from the dashboard
const ALLOWED_FIELDS = [
  "status",
  "totalPrice",
  "paymentStatus",
  "trackingNumber",
  "notes",
  "estimatedDelivery",
  "actualDelivery",
  // Employee tracking fields
  "addressConfirmedBy",
  "addressConfirmedAt",
  "orderConfirmedBy",
  "orderConfirmedAt",
  "packedBy",
  "packedAt",
  "packingNotes",
  "dispatchedBy",
  "dispatchedAt",
  "assignedWarehouseBy",
  "assignedWarehouseAt",
  "assignedDeliverymanId",
  "assignedDeliverymanName",
  "deliveredBy",
  "deliveredAt",
  "deliveryNotes",
  "deliveryAttempts",
  "rescheduledDate",
  "rescheduledReason",
  // Cash collection
  "cashCollected",
  "cashCollectedAmount",
  "cashCollectedAt",
  "paymentReceivedBy",
  "paymentReceivedAt",
  // Cancellation fields
  "cancelledAt",
  "cancelledBy",
  "refundedToWallet",
  "refundAmount",
] as const;

const ORDER_STATUS_VALUES = [
  "pending",
  "address_confirmed",
  "order_confirmed",
  "packed",
  "ready_for_delivery",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "rescheduled",
  "failed_delivery",
];
const PAYMENT_STATUS_VALUES = ["pending", "awaiting_verification", "paid", "failed", "cancelled", "refunded"];
const NUMBER_FIELDS = ["totalPrice", "cashCollectedAmount", "refundAmount", "deliveryAttempts"];
const BOOLEAN_FIELDS = ["cashCollected", "refundedToWallet"];

/** Validates the admin's changes; returns clean values or an error message */
function cleanUpdate(body: Record<string, unknown>):
  | { ok: true; data: Record<string, string | number | boolean> }
  | { ok: false; error: string } {
  const data: Record<string, string | number | boolean> = {};
  for (const key of ALLOWED_FIELDS) {
    const value = body?.[key];
    if (value === undefined || value === null) continue;
    if (NUMBER_FIELDS.includes(key)) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${key} must be a positive number` };
      data[key] = n;
    } else if (BOOLEAN_FIELDS.includes(key)) {
      if (typeof value !== "boolean") return { ok: false, error: `${key} must be true or false` };
      data[key] = value;
    } else {
      if (typeof value !== "string") return { ok: false, error: `${key} must be text` };
      data[key] = value.slice(0, 2000);
    }
  }
  if (typeof data.status === "string" && !ORDER_STATUS_VALUES.includes(data.status)) {
    return { ok: false, error: "Unknown order status" };
  }
  if (typeof data.paymentStatus === "string" && !PAYMENT_STATUS_VALUES.includes(data.paymentStatus)) {
    return { ok: false, error: "Unknown payment status" };
  }
  return { ok: true, data };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin rights require a Clerk-verified admin email
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;
    const { userId, email: userEmail } = admin;

    const { id } = await params;
    const updateData = await req.json().catch(() => null);
    if (!updateData || typeof updateData !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const cleaned = cleanUpdate(updateData);
    if (!cleaned.ok) {
      return NextResponse.json({ error: cleaned.error }, { status: 400 });
    }
    const filteredUpdateData: Record<string, string | number | boolean> = cleaned.data;

    // Fetch the current order (with its revision, for the optimistic lock)
    const currentOrder = await writeClient.fetch(
      `*[_type == "order" && _id == $id][0] {
        _id,
        _rev,
        orderNumber,
        ${ALLOWED_FIELDS.join(",\n        ")},
        amountPaid,
        clerkUserId,
        user -> {
          clerkUserId,
          email,
          firstName,
          lastName
        }
      }`,
      { id }
    );

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isCancelling =
      filteredUpdateData.status === "cancelled" && currentOrder.status !== "cancelled";
    const isPaidOrder = currentOrder.paymentStatus === "paid";
    const amountToRefund = Number(currentOrder.amountPaid || currentOrder.totalPrice || 0);
    const userClerkId = currentOrder.clerkUserId || currentOrder.user?.clerkUserId;
    const needsRefund = isCancelling && isPaidOrder && amountToRefund > 0;

    if (isCancelling) {
      filteredUpdateData.cancelledAt = new Date().toISOString();
      filteredUpdateData.cancelledBy = userEmail;
      if (needsRefund) {
        // Stays "paid" until the wallet credit below succeeds
        filteredUpdateData.paymentStatus = "paid";
        filteredUpdateData.refundedToWallet = false;
        filteredUpdateData.refundAmount = 0;
        filteredUpdateData.refundRequired = true;
      }
    }

    // 1) Apply the change only if nobody else changed the order since we read it,
    //    so a double submit can never cancel + refund twice.
    let updatedOrder;
    try {
      updatedOrder = await writeClient
        .patch(id)
        .ifRevisionId(currentOrder._rev)
        .set({ ...filteredUpdateData, _updatedAt: new Date().toISOString() })
        .commit();
    } catch (error) {
      if (isRevisionConflict(error)) {
        return NextResponse.json(
          { error: "This order was just updated by someone else. Refresh and try again." },
          { status: 409 }
        );
      }
      throw error;
    }

    // 2) Refund paid orders to the wallet (idempotent per order id)
    let walletRefunded = false;
    let refundAmount = 0;
    if (needsRefund) {
      if (userClerkId) {
        const refundResult = await addWalletCredit(
          userClerkId,
          amountToRefund,
          `Refund for cancelled order #${currentOrder.orderNumber}`,
          id,
          userEmail
        );
        if (refundResult.success) {
          walletRefunded = true;
          refundAmount = amountToRefund;
          const refundFields = {
            refundedToWallet: true,
            refundAmount,
            paymentStatus: "refunded",
            refundRequired: false,
          };
          Object.assign(filteredUpdateData, refundFields);
          updatedOrder = await writeClient.patch(id).set(refundFields).commit();
          console.log(
            `Refunded ${formatPrice(refundAmount)} to user wallet for order ${currentOrder.orderNumber}`
          );
        } else {
          console.error("Failed to add refund to wallet:", refundResult.message);
        }
      } else {
        console.warn(`Cannot process refund: No clerkUserId found for order ${id}`);
      }
    }

    if (isCancelling) {
      await restoreOrderStock(id);
    }

    // Audit trail: before/after of every field that changed
    const { before, after } = diffFields(currentOrder, filteredUpdateData);
    if (Object.keys(after).length > 0) {
      await writeAuditLog({
        actorClerkId: userId,
        actorEmail: userEmail,
        actorRole: "admin",
        action: isCancelling ? "order.cancel.admin" : "order.update",
        targetId: id,
        targetType: "order",
        before,
        after,
        note: walletRefunded ? `Refunded ${refundAmount} to wallet` : undefined,
      });
    }

    const newStatus = filteredUpdateData.status;
    // Track order status update and send notification if status was changed
    if (typeof newStatus === "string" && newStatus !== currentOrder.status) {
      // Track analytics
      try {
        await fetch(
          `${
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
          }/api/analytics/track`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventName: "order_status_update",
              eventParams: {
                orderId: id,
                status: newStatus,
                previousStatus: currentOrder.status,
                adminUserId: userId,
              },
            }),
          }
        );
      } catch (analyticsError) {
        console.error(
          "Failed to track order status update event:",
          analyticsError
        );
      }

      // Send notification to user
      try {
        if (userClerkId) {
          await sendOrderStatusNotification({
            clerkUserId: userClerkId,
            orderNumber: currentOrder.orderNumber,
            orderId: id,
            status: newStatus,
            previousStatus: currentOrder.status,
          });
        } else {
          console.warn(
            `Cannot send notification: No clerkUserId found for order ${id}`
          );
        }
      } catch (notificationError) {
        console.error(
          "Failed to send order status notification:",
          notificationError
        );
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      message: walletRefunded
        ? `Order updated successfully. ${formatPrice(refundAmount)} refunded to customer's wallet.`
        : needsRefund
          ? "Order cancelled, but the wallet refund failed. The order is flagged for a manual refund."
          : "Order updated successfully",
      order: updatedOrder,
      walletRefunded,
      refundAmount: walletRefunded ? refundAmount : 0,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Admin rights require a Clerk-verified admin email
    const admin = await requireAdmin();
    if (!admin.ok) return admin.response;

    const { id } = await params;

    // Fetch the specific order from Sanity
    const query = `
      *[_type == "order" && _id == $id][0] {
        _id,
        _createdAt,
        _updatedAt,
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
        trackingNumber,
        notes,
        estimatedDelivery,
        actualDelivery,
        // Employee tracking fields
        addressConfirmedBy,
        addressConfirmedAt,
        orderConfirmedBy,
        orderConfirmedAt,
        packedBy,
        packedAt,
        packingNotes,
        dispatchedBy,
        dispatchedAt,
        assignedWarehouseBy,
        assignedWarehouseAt,
        assignedDeliverymanId,
        assignedDeliverymanName,
        deliveredBy,
        deliveredAt,
        deliveryNotes,
        deliveryAttempts,
        rescheduledDate,
        rescheduledReason,
        // Cash collection
        cashCollected,
        cashCollectedAmount,
        cashCollectedAt,
        paymentReceivedBy,
        paymentReceivedAt,
        // Cancellation request fields
        cancellationRequested,
        cancellationRequestedAt,
        cancellationRequestReason,
        // Cancellation fields
        cancelledAt,
        cancelledBy,
        cancellationReason,
        refundedToWallet,
        refundAmount,
        refundRequired,
        stockShortage,
        reservedUntil,
        amountPaid
      }
    `;

    const order = await writeClient.fetch(query, { id });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
