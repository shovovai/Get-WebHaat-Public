import type { Metadata } from "next";
import Link from "next/link";
import InfoShell, { InfoSection } from "@/components/info/InfoShell";
import { getSiteSettings } from "@/lib/siteSeo";

export const metadata: Metadata = {
  title: "About us",
  description: "Who we are, what we sell and the promises we keep to every customer.",
};

export default async function AboutPage() {
  const { storeName } = await getSiteSettings();

  return (
    <InfoShell
      active="/about"
      title="About us"
      intro={
        <>
          <p>
            The story of <strong className="font-medium text-ink">{storeName}</strong> has just begun.
          </p>
          <p className="mt-4">
            {storeName} is an online store built around a simple idea: good products, honest prices and service
            you can actually reach. Every item we list is chosen with care, described truthfully and delivered to
            your door — with cash on delivery available when you prefer to pay in person.
          </p>
        </>
      }
    >
      <p className="mx-auto max-w-md py-8 text-center text-lg italic leading-8 text-ink">
        Our mission is to serve our customers with quality products and service that feels personal.
      </p>

      <InfoSection title="What we stand for">
        <ul>
          <li>
            <strong className="font-medium text-ink">Honest prices</strong> — the price you see is the price you pay;
            any delivery charge is shown before you order.
          </li>
          <li>
            <strong className="font-medium text-ink">Real support</strong> — friendly people who answer calls and
            emails, before and after you buy.
          </li>
          <li>
            <strong className="font-medium text-ink">Easy returns</strong> — changed your mind? Return eligible items
            within 7 days of delivery.
          </li>
          <li>
            <strong className="font-medium text-ink">Secure checkout</strong> — pay by cash on delivery or through
            trusted, encrypted payment gateways.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Get in touch">
        <p>
          Questions, feedback or wholesale enquiries — we&apos;d love to hear from you. Visit our{" "}
          <Link href="/contact">contact page</Link> or browse the <Link href="/help">help center</Link>.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
