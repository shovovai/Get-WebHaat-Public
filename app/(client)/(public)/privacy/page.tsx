import type { Metadata } from "next";
import Link from "next/link";
import InfoShell, { InfoSection } from "@/components/info/InfoShell";
import { getSiteSettings } from "@/lib/siteSeo";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal information we collect, why, and how you control it.",
};

export default async function PrivacyPage() {
  const { storeName, supportEmail } = await getSiteSettings();

  return (
    <InfoShell
      active="/privacy"
      title="Privacy policy"
      intro={
        <p>
          Your privacy matters to us. This policy explains what {storeName} collects when you shop with us, why we
          need it, and the choices you have.
        </p>
      }
    >
      <InfoSection title="What we collect">
        <ul>
          <li>Account details: your name, email address and phone number.</li>
          <li>Order details: delivery addresses, items ordered and payment method.</li>
          <li>Messages you send us through the contact form or email.</li>
          <li>Basic usage data (pages visited, device type) to keep the site working and improve it.</li>
        </ul>
      </InfoSection>

      <InfoSection title="How we use it">
        <ul>
          <li>To process, deliver and support your orders.</li>
          <li>To send order updates and, if you subscribe, our newsletter.</li>
          <li>To prevent fraud and keep your account secure.</li>
        </ul>
        <p>We never sell your personal information.</p>
      </InfoSection>

      <InfoSection title="Payments">
        <p>
          Online payments are handled by our payment partners over encrypted connections. We don&apos;t see or store
          full card numbers.
        </p>
      </InfoSection>

      <InfoSection title="Cookies & analytics">
        <p>
          We use essential cookies to keep you signed in and remember your bag. If analytics are enabled, they help
          us understand which pages are useful. You can clear cookies anytime in your browser.
        </p>
      </InfoSection>

      <InfoSection title="Sharing">
        <p>
          We share only what&apos;s needed with the services that run the store — delivery partners, payment gateways,
          email and hosting providers — and only to serve you.
        </p>
        <p>
          The store software (WebHaat) reports its own web address and version to its maintainer when it starts, so
          they can offer setup and care. This is about the software, not about you: no customer or order data is sent.
        </p>
      </InfoSection>

      <InfoSection title="Your choices">
        <ul>
          <li>Update your profile and addresses from your account.</li>
          <li>
            Download all your data or delete your account from <Link href="/user/settings">Account → Settings</Link>.
          </li>
          <li>Unsubscribe from the newsletter using the link in any newsletter email.</li>
        </ul>
        <p>We keep past orders after an account is deleted, as required for accounting.</p>
      </InfoSection>

      <InfoSection title="Contact">
        <p>
          Questions about your data? Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
