"use server";
import { restoreOrderStock } from "@/lib/stock";
import { formatPrice } from "@/lib/storeConfig";

import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { addWalletCredit } from "@/lib/walletCredit";
import { sendOrderStatusNotification } from "@/lib/notificationService";
import { revalidatePath } from "next/cache";
import { getAdminEmail } from "@/lib/adminAuth";
import { writeAuditLog } from "@/lib/auditLog";
import { customerCancellationError, isRevisionConflict } from "@/lib/orderGuards";

const CHANGED_MEANWHILE = "This order was just updated by someone else. Refresh and try again.";

/**
 * Cancels an order exactly once and refunds paid orders to the wallet.
 * Step 1 claims the order with `ifRevisionId` (a double click or a second admin gets a
 * conflict instead of a second refund). Step 2 credits the wallet, which is itself
 * idempotent per order id. If the credit fails the order stays cancelled with
 * paymentStatus "paid" and refundRequired=true so it shows up for a manual refund.
 */
async function cancelAndRefund(
  order: {
    _id: string;
    _rev: string;
    orderNumber: string;
    status?: string;
    paymentStatus?: string;
    totalPrice?: number;
    amountPaid?: number;
    clerkUserId?: string;
  },
  actor: { clerkUserId: string; email: string },
  reason: string | undefined,
  action: string
): Promise<{ refunded: boolean; refundAmount: number }> {
  const isPaid = order.paymentStatus === "paid";
  const refundAmount = isPaid ? Number(order.amountPaid || order.totalPrice || 0) : 0;
  const now = new Date().toISOString();

  // 1) claim (throws 409 if the order changed since we read it)
  await backendClient
    .patch(order._id)
    .ifRevisionId(order._rev)
    .set({
      status: "cancelled",
      paymentStatus: isPaid ? "paid" : "cancelled",
      cancelledAt: now,
      cancelledBy: actor.email,
      cancellationReason: reason,
      cancellationRequested: false,
      refundedToWallet: false,
      refundAmount: 0,
      ...(isPaid && refundAmount > 0 && { refundRequired: true }),
    })
    .commit();

  // 2) refund (idempotent per order)
  let refunded = false;
  if (isPaid && refundAmount > 0 && order.clerkUserId) {
    const result = await addWalletCredit(
      order.clerkUserId,
      refundAmount,
      `Refund for cancelled order #${order.orderNumber}`,
      order._id,
      actor.email
    );
    if (result.success) {
      refunded = true;
      await backendClient
        .patch(order._id)
        .set({ paymentStatus: "refunded", refundedToWallet: true, refundAmount, refundRequired: false })
        .commit();
    } else {
      console.error("Failed to add refund to wallet:", result.message);
    }
  }
  await restoreOrderStock(order._id);

  await writeAuditLog({
    actorClerkId: actor.clerkUserId,
    actorEmail: actor.email,
    actorRole: "admin",
    action,
    targetId: order._id,
    targetType: "order",
    before: { status: order.status, paymentStatus: order.paymentStatus },
    after: {
      status: "cancelled",
      paymentStatus: refunded ? "refunded" : isPaid ? "paid" : "cancelled",
      refundedToWallet: refunded,
      refundAmount: refunded ? refundAmount : 0,
      ...(isPaid && !refunded && refundAmount > 0 && { refundRequired: true }),
    },
    note: reason,
  });

  return { refunded, refundAmount };
}

/**
 * Admin: Approve cancellation request and cancel order with refund
 */
export async function approveCancellationRequest(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Admin rights come from Clerk (verified email), never from the Sanity user document
    const adminEmail = await getAdminEmail();
    const adminUser = { email: adminEmail ?? undefined };

    if (!adminEmail) {
      return {
        success: false,
        message: "Admin access required to approve cancellation requests",
      };
    }

    // Fetch order details
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]{
        _id,
        _rev,
        orderNumber,
        status,
        paymentStatus,
        totalPrice,
        amountPaid,
        clerkUserId,
        cancellationRequested,
        cancellationRequestReason
      }`,
      { orderId }
    );

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    if (!order.cancellationRequested) {
      return {
        success: false,
        message: "No cancellation request found for this order",
      };
    }

    if (order.status === "cancelled") {
      return { success: false, message: "Order is already cancelled" };
    }

    const { refunded, refundAmount } = await cancelAndRefund(
      order,
      { clerkUserId, email: adminEmail },
      order.cancellationRequestReason,
      "order.cancel.approve"
    );
    const shouldRefund = refundAmount > 0;

    // Send notification to customer
    try {
      await sendOrderStatusNotification({
        clerkUserId: order.clerkUserId,
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: "cancelled",
      });
    } catch (notificationError) {
      console.error(
        "Failed to send cancellation notification:",
        notificationError
      );
    }

    revalidatePath("/admin/orders");
    revalidatePath("/user/orders");

    const message = refunded
      ? `Cancellation approved. ${formatPrice(refundAmount)} has been credited to the customer's wallet.`
      : shouldRefund
        ? "Cancellation approved, but the wallet refund failed. The order is flagged for a manual refund."
        : "Cancellation approved successfully.";

    return { success: true, message };
  } catch (error) {
    if (isRevisionConflict(error)) return { success: false, message: CHANGED_MEANWHILE };
    console.error("Error approving cancellation request:", error);
    return {
      success: false,
      message: "Failed to approve cancellation request",
    };
  }
}

/**
 * Admin: Reject cancellation request and proceed with order confirmation
 */
export async function rejectCancellationRequest(
  orderId: string,
  rejectionReason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Admin rights come from Clerk (verified email), never from the Sanity user document
    const adminEmail = await getAdminEmail();
    const adminUser = { email: adminEmail ?? undefined };

    if (!adminEmail) {
      return {
        success: false,
        message: "Admin access required to reject cancellation requests",
      };
    }

    // Fetch order details
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]{
        _id,
        _rev,
        orderNumber,
        status,
        cancellationRequested,
        clerkUserId
      }`,
      { orderId }
    );

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    if (!order.cancellationRequested) {
      return {
        success: false,
        message: "No cancellation request found for this order",
      };
    }

    // Clear the request. The order keeps its current status so the staff workflow
    // (pending → address_confirmed → order_confirmed → …) continues where it was.
    await backendClient
      .patch(order._id)
      .ifRevisionId(order._rev)
      .set({ cancellationRequested: false })
      .unset(["cancellationRequestedAt", "cancellationRequestReason"])
      .commit();

    await writeAuditLog({
      actorClerkId: clerkUserId,
      actorEmail: adminEmail,
      actorRole: "admin",
      action: "order.cancel.reject",
      targetId: order._id,
      targetType: "order",
      before: { cancellationRequested: true },
      after: { cancellationRequested: false },
      note: rejectionReason,
    });

    // Send notification to customer
    try {
      await sendOrderStatusNotification({
        clerkUserId: order.clerkUserId,
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: "confirmed",
        previousStatus: order.status,
      });
    } catch (notificationError) {
      console.error(
        "Failed to send confirmation notification:",
        notificationError
      );
    }

    revalidatePath("/admin/orders");
    revalidatePath("/user/orders");

    return {
      success: true,
      message: rejectionReason
        ? `Cancellation request rejected: ${rejectionReason}. Order confirmed.`
        : "Cancellation request rejected. Order confirmed and will be processed.",
    };
  } catch (error) {
    if (isRevisionConflict(error)) return { success: false, message: CHANGED_MEANWHILE };
    console.error("Error rejecting cancellation request:", error);
    return { success: false, message: "Failed to reject cancellation request" };
  }
}

/**
 * Admin: Cancel order and refund to wallet if paid
 */
export async function cancelOrder(
  orderId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Admin rights come from Clerk (verified email), never from the Sanity user document
    const adminEmail = await getAdminEmail();
    const adminUser = { email: adminEmail ?? undefined };

    if (!adminEmail) {
      return {
        success: false,
        message: "Admin access required to cancel orders",
      };
    }

    // Fetch order details
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId][0]{
        _id,
        _rev,
        orderNumber,
        status,
        paymentStatus,
        totalPrice,
        amountPaid,
        paymentMethod,
        clerkUserId
      }`,
      { orderId }
    );

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    if (order.status === "cancelled") {
      return { success: false, message: "Order is already cancelled" };
    }

    if (order.status === "delivered" || order.status === "completed") {
      return {
        success: false,
        message:
          "Cannot cancel delivered orders. Please process a return instead.",
      };
    }

    const { refunded, refundAmount } = await cancelAndRefund(
      order,
      { clerkUserId, email: adminEmail },
      reason,
      "order.cancel.admin"
    );
    const shouldRefund = refundAmount > 0;

    // Send notification to customer
    try {
      await sendOrderStatusNotification({
        clerkUserId: order.clerkUserId,
        orderNumber: order.orderNumber,
        orderId: order._id,
        status: "cancelled",
      });
    } catch (notificationError) {
      console.error(
        "Failed to send cancellation notification:",
        notificationError
      );
    }

    const message = refunded
      ? `Order cancelled successfully. ${formatPrice(refundAmount)} has been credited to the customer's wallet.`
      : shouldRefund
        ? "Order cancelled, but the wallet refund failed. The order is flagged for a manual refund."
        : "Order cancelled successfully.";

    return {
      success: true,
      message,
    };
  } catch (error) {
    if (isRevisionConflict(error)) return { success: false, message: CHANGED_MEANWHILE };
    console.error("Error cancelling order:", error);
    return {
      success: false,
      message: "Failed to cancel order",
    };
  }
}

/**
 * User: Request order cancellation (before shipping)
 * Sets cancellationRequested flag for admin approval
 */
export async function requestOrderCancellation(
  orderId: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return { success: false, message: "Unauthorized" };
    }

    // Get order details
    const order = await backendClient.fetch(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id,
        _rev,
        orderNumber,
        status,
        paymentStatus,
        totalPrice,
        amountPaid,
        paymentMethod,
        cashCollected,
        cancellationRequested
      }`,
      { orderId, clerkUserId }
    );

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    // Only before packing (pending / address_confirmed / order_confirmed) and never
    // after cash was collected
    const notAllowed = customerCancellationError(order);
    if (notAllowed) {
      return { success: false, message: notAllowed };
    }

    // ifRevisionId: the order must not have moved on (e.g. been packed) since we checked
    await backendClient
      .patch(order._id)
      .ifRevisionId(order._rev)
      .set({
        cancellationRequested: true,
        cancellationRequestedAt: new Date().toISOString(),
        cancellationRequestReason: String(reason || "").slice(0, 1000),
      })
      .commit();

    return {
      success: true,
      message:
        "Cancellation request submitted. Our team will review and process your request shortly.",
    };
  } catch (error) {
    if (isRevisionConflict(error)) {
      return { success: false, message: "Your order was just updated. Please refresh and try again." };
    }
    console.error("Error requesting order cancellation:", error);
    return {
      success: false,
      message: "Failed to submit cancellation request",
    };
  }
}
