import type { Metadata } from "next";
import Link from "next/link";
import InfoShell, { InfoSection } from "@/components/info/InfoShell";
import { getSiteSettings } from "@/lib/siteSeo";
import { getPaymentOptions } from "@/lib/paymentConfig";
import { formatPrice } from "@/lib/storeConfig";

export const metadata: Metadata = {
  title: "Delivery & returns",
  description: "Delivery charges, delivery times, payment options and how returns and refunds work.",
};

export const revalidate = 300;

export default async function DeliveryReturnsPage() {
  const [settings, options] = await Promise.all([getSiteSettings(), getPaymentOptions().catch(() => [])]);
  const { deliveryCharge, freeDeliveryOver } = settings;
  const methods = [...new Set(options.map((o) => o.label))];

  const chargeText =
    deliveryCharge <= 0
      ? "Free"
      : freeDeliveryOver > 0
        ? `${formatPrice(deliveryCharge)} — free for orders of ${formatPrice(freeDeliveryOver)} or more`
        : formatPrice(deliveryCharge);

  return (
    <InfoShell
      active="/delivery-returns"
      title="Delivery & returns"
      intro={
        <p>
          We deliver to your door and keep you updated at every step. One delivery address is used per order — if
          you&apos;d like items sent to different addresses, please place separate orders.
        </p>
      }
    >
      <InfoSection title="Delivery charge">
        <div className="overflow-x-auto rounded-md">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Delivery charge</th>
                <th>Delivery time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Every order, any payment method</td>
                <td>{chargeText}</td>
                <td>Usually 2–5 working days</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>The exact delivery charge is always shown in your bag and at checkout before you place the order.</p>
      </InfoSection>

      <InfoSection title="Payment options">
        {methods.length ? (
          <ul>
            {methods.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        ) : (
          <p>Available payment methods are shown at checkout.</p>
        )}
        <p>For cash on delivery, please keep the exact amount ready when your order arrives.</p>
      </InfoSection>

      <InfoSection title="Order updates">
        <p>
          We confirm every order by phone or message, then notify you when it ships and when it&apos;s delivered.
          You can follow your order anytime in <Link href="/user/orders">My orders</Link>.
        </p>
      </InfoSection>

      <InfoSection title="Returns & exchanges">
        <ul>
          <li>Return eligible items within 7 days of delivery.</li>
          <li>Items must be unused, with original tags and packaging.</li>
          <li>For hygiene reasons some items (e.g. personal care, opened fragrances) can&apos;t be returned.</li>
          <li>
            To start a return, <Link href="/contact">contact us</Link> with your order number and the reason.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Refunds">
        <p>
          Once we receive and check the returned item, we refund you within 5–10 working days — to your original
          payment method, or to your store wallet for cash-on-delivery orders. Cancelled prepaid orders are refunded
          the same way.
        </p>
      </InfoSection>

      <InfoSection title="Damaged or wrong item?">
        <p>
          Please tell us within 48 hours of delivery with a photo of the item and packaging, and we&apos;ll replace it
          or refund you in full.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
