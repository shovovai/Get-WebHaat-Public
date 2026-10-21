import "server-only";
import { sendMail, sendOrderConfirmationEmail } from "@/lib/emailService";
import { getEmailImageUrl } from "@/lib/emailImageUtils";
import { getAdminEmails } from "@/lib/adminUtils";
import { formatPrice } from "@/lib/storeConfig";
import { brand } from "@/config/brand";
import type { PricingResult } from "@/lib/pricing";

interface OrderEmailInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  pricing: PricingResult;
  address: { name?: string; address?: string; city?: string; state?: string; zip?: string };
}

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const paymentLabel = (m: string) =>
  ({
    cash_on_delivery: "Cash on delivery",
    stripe: "Card (Stripe)",
    sslcommerz: "SSLCommerz (bKash / Nagad / card)",
    bkash: "bKash",
    nagad: "Nagad",
    manual: "Manual transfer (awaiting verification)",
  })[m] || m;

/** Order confirmation to the customer. Never throws. */
export async function sendCustomerOrderEmail(input: OrderEmailInput) {
  try {
    const delivery = new Date();
    delivery.setDate(delivery.getDate() + 5);
    await sendOrderConfirmationEmail({
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      orderId: input.orderNumber,
      orderDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      items: input.pricing.lines.map((l) => ({
        name: l.name,
        price: l.unitPrice,
        quantity: l.quantity,
        image: getEmailImageUrl(l.image as never),
      })),
      subtotal: input.pricing.subtotal,
      discount: input.pricing.discountTotal || undefined,
      couponCode: input.pricing.coupon?.code,
      shipping: input.pricing.shipping,
      tax: input.pricing.tax,
      total: input.pricing.total,
      shippingAddress: {
        name: input.address.name || input.customerName,
        street: input.address.address || "",
        city: input.address.city || "",
        state: input.address.state || "",
        zipCode: input.address.zip || "",
        country: "",
      },
      estimatedDelivery: delivery.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    });
  } catch (error) {
    console.error("Customer order email failed:", error);
  }
}

/** "New order" alert to every admin in NEXT_PUBLIC_ADMIN_EMAIL. Never throws. */
export async function sendAdminNewOrderEmail(input: OrderEmailInput) {
  const recipients = getAdminEmails();
  if (recipients.length === 0) return;

  const { pricing } = input;
  const adminUrl = `${brand.url}/admin/orders`;
  const rows = pricing.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0">${escape(l.name)} × ${l.quantity}</td><td style="padding:6px 0;text-align:right">${formatPrice(l.lineTotal)}</td></tr>`
    )
    .join("");

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f1a17">
  <h2 style="margin:0 0 4px">New order ${escape(input.orderNumber)}</h2>
  <p style="margin:0 0 16px;color:#6b625b">${escape(input.customerName)} &lt;${escape(input.customerEmail)}&gt; · ${escape(paymentLabel(input.paymentMethod))}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    ${pricing.discountTotal ? `<tr><td style="padding:6px 0;color:#6b625b">Discount${pricing.coupon ? ` (${escape(pricing.coupon.code)})` : ""}</td><td style="text-align:right;color:#6b625b">-${formatPrice(pricing.discountTotal)}</td></tr>` : ""}
    <tr><td style="padding:6px 0;color:#6b625b">Shipping</td><td style="text-align:right;color:#6b625b">${formatPrice(pricing.shipping)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b625b">Tax</td><td style="text-align:right;color:#6b625b">${formatPrice(pricing.tax)}</td></tr>
    <tr><td style="padding:10px 0;border-top:1px solid #e7e1d9;font-weight:bold">Total</td><td style="padding:10px 0;border-top:1px solid #e7e1d9;text-align:right;font-weight:bold">${formatPrice(pricing.total)}</td></tr>
  </table>
  <p style="font-size:14px;color:#6b625b">Ship to: ${escape([input.address.name, input.address.address, input.address.city, input.address.state, input.address.zip].filter(Boolean).join(", "))}</p>
  <p><a href="${adminUrl}" style="background:#0a0a0a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:bold">Open in admin</a></p>
</div>`;

  await Promise.all(
    recipients.map((email) =>
      sendMail({
        email,
        subject: `New order ${input.orderNumber} — ${formatPrice(pricing.total)}`,
        text: `New order ${input.orderNumber} from ${input.customerName} (${input.customerEmail}). Total ${formatPrice(pricing.total)}. ${adminUrl}`,
        html,
      }).catch((e) => console.error("Admin order email failed:", e))
    )
  );
}
