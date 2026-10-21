import type { Metadata } from "next";
import Link from "next/link";
import InfoShell, { InfoSection } from "@/components/info/InfoShell";
import { getSiteSettings } from "@/lib/siteSeo";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms that apply when you use our website and place an order.",
};

export default async function TermsPage() {
  const { storeName, supportEmail } = await getSiteSettings();

  return (
    <InfoShell
      active="/terms"
      title="Terms & conditions"
      intro={
        <p>
          These terms apply when you use the {storeName} website and place an order with us. By using the site you
          agree to them — please read them carefully.
        </p>
      }
    >
      <InfoSection title="Orders">
        <ul>
          <li>An order is confirmed once we accept it and send you a confirmation.</li>
          <li>All orders are subject to availability. If an item is unavailable we&apos;ll tell you and refund any payment.</li>
          <li>We may cancel orders that look fraudulent or contain obvious pricing errors.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Prices & payment">
        <ul>
          <li>Prices are shown in the store currency and include any listed discount.</li>
          <li>The delivery charge is shown in your bag and at checkout before you pay.</li>
          <li>Online payments are processed by secure payment gateways; we never see or store your card number.</li>
          <li>For manual transfers, your order is confirmed after we verify the payment.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Delivery, returns & refunds">
        <p>
          Delivery times, charges, returns and refunds are explained on our{" "}
          <Link href="/delivery-returns">Delivery & returns</Link> page, which forms part of these terms.
        </p>
      </InfoSection>

      <InfoSection title="Your account">
        <ul>
          <li>Keep your login details private — you&apos;re responsible for activity on your account.</li>
          <li>Give accurate information so we can deliver your orders.</li>
          <li>You can download your data or delete your account anytime from Account → Settings.</li>
        </ul>
      </InfoSection>

      <InfoSection title="Reviews">
        <p>
          Reviews must be honest and about the product. We may decline reviews that are offensive, off-topic or
          contain personal information.
        </p>
      </InfoSection>

      <InfoSection title="Intellectual property">
        <p>
          All content on this website — text, photos, logos and design — belongs to {storeName} or its licensors and
          may not be copied without permission.
        </p>
      </InfoSection>

      <InfoSection title="Liability">
        <p>
          We do our best to keep product information accurate and the site available, but we can&apos;t guarantee it
          will always be error-free. Nothing in these terms limits rights you have under consumer protection law.
        </p>
      </InfoSection>

      <InfoSection title="Changes & contact">
        <p>
          We may update these terms from time to time; the latest version is always on this page. Questions? Email{" "}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
