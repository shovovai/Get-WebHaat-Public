import "server-only";
import { backendClient } from "@/sanity/lib/backendClient";
import { createNotification } from "@/lib/notificationService";
import { sendMail } from "@/lib/emailService";
import { getAdminEmails } from "@/lib/adminUtils";
import { formatPrice } from "@/lib/storeConfig";
import { brand } from "@/config/brand";
import { PAYMENT_STATUSES } from "@/lib/orderStatus";
import { escapeHtml } from "@/lib/html";

interface OrderLite {
  _id: string;
  orderNumber: string;
  clerkUserId?: string;
  email?: string;
  customerName?: string;
  totalPrice?: number;
  paymentStatus?: string;
}

async function loadOrder(orderId: string) {
  return backendClient.fetch<OrderLite | null>(
    `*[_type == "order" && _id == $orderId][0]{ _id, orderNumber, clerkUserId, email, customerName, totalPrice, paymentStatus }`,
    { orderId }
  );
}

async function notifyCustomer(order: OrderLite, title: string, message: string) {
  const url = `${brand.url}/user/orders/${order._id}`;
  if (order.clerkUserId) {
    await createNotification({
      clerkUserId: order.clerkUserId,
      title,
      message,
      type: "order",
      priority: "high",
      actionUrl: `/user/orders/${order._id}`,
    }).catch(() => {});
  }
  if (order.email) {
    await sendMail({
      email: order.email,
      subject: `${title} — order ${order.orderNumber}`,
      text: `${message}\n\nView your order: ${url}`,
      // message can contain admin-typed text (rejection reason): always escape
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f1a17"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(url)}" style="background:#0a0a0a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">View order</a></p><p style="color:#6b625b;font-size:12px">${escapeHtml(brand.name)}</p></div>`,
    }).catch(() => {});
  }
}

/**
 * Marks an order as paid. Only the payment fields change — the fulfillment
 * status (pending → confirmed → packed …) is left alone so staff still see it.
 */
export async function markOrderPaid(
  orderId: string,
  opts: { transactionId?: string; gatewayPaymentId?: string; set?: Record<string, unknown> } = {}
) {
  const order = await loadOrder(orderId);
  if (!order) return { ok: false as const, error: "Order not found" };
  if (order.paymentStatus === PAYMENT_STATUSES.PAID) return { ok: true as const, alreadyPaid: true };

  await backendClient
    .patch(orderId)
    .set({
      paymentStatus: PAYMENT_STATUSES.PAID,
      paidAt: new Date().toISOString(),
      ...(opts.transactionId && { paymentTransactionId: opts.transactionId }),
      ...(opts.gatewayPaymentId && { gatewayPaymentId: opts.gatewayPaymentId }),
      ...(opts.set || {}),
    })
    .commit();

  await notifyCustomer(
    order,
    "Payment received",
    `We've received your payment of ${formatPrice(order.totalPrice)} for order ${order.orderNumber}. Thank you!`
  );
  return { ok: true as const };
}

export async function markManualPaymentRejected(orderId: string, reason: string, adminEmail: string) {
  const order = await loadOrder(orderId);
  if (!order) return { ok: false as const, error: "Order not found" };

  await backendClient
    .patch(orderId)
    .set({
      paymentStatus: PAYMENT_STATUSES.FAILED,
      "manualPayment.rejectionReason": reason,
      "manualPayment.verifiedBy": adminEmail,
      "manualPayment.verifiedAt": new Date().toISOString(),
    })
    .commit();

  await notifyCustomer(
    order,
    "Payment could not be verified",
    `We couldn't verify the payment for order ${order.orderNumber}${reason ? `: ${reason}` : ""}. Please check the transaction ID and submit it again from your order page, or contact us.`
  );
  return { ok: true as const };
}

/** Tell admins a customer submitted a manual payment to verify */
export async function notifyAdminsOfManualPayment(order: {
  orderNumber: string;
  totalPrice?: number;
  provider?: string;
  senderNumber: string;
  transactionId: string;
}) {
  const url = `${brand.url}/admin/payments`;
  await Promise.all(
    getAdminEmails().map((email) =>
      sendMail({
        email,
        subject: `Verify payment for ${order.orderNumber}`,
        text: `Customer paid ${formatPrice(order.totalPrice)} via ${order.provider || "manual transfer"} from ${order.senderNumber}. TrxID: ${order.transactionId}. Verify at ${url}`,
        // senderNumber / transactionId are customer-typed: always escape
        html: `<div style="font-family:Arial,sans-serif"><h3>Payment to verify — ${escapeHtml(order.orderNumber)}</h3><p>Amount: <b>${escapeHtml(formatPrice(order.totalPrice))}</b><br>Method: ${escapeHtml(order.provider || "manual")}<br>Sender: ${escapeHtml(order.senderNumber)}<br>TrxID: <b>${escapeHtml(order.transactionId)}</b></p><p><a href="${escapeHtml(url)}">Open payment verifications</a></p></div>`,
      }).catch(() => {})
    )
  );
}
