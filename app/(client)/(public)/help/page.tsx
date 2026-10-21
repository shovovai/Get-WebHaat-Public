import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CreditCard, Package, RotateCcw, Truck, UserRound, MessageCircle } from "lucide-react";
import InfoShell from "@/components/info/InfoShell";
import { getSiteSettings } from "@/lib/siteSeo";
import { contactConfig } from "@/config/contact";

export const metadata: Metadata = {
  title: "Help center",
  description: "Get help with orders, delivery, payments, returns and your account.",
};

const topics = [
  { icon: Package, title: "Track my order", text: "See the status of your orders", href: "/user/orders" },
  { icon: Truck, title: "Delivery", text: "Charges, times and updates", href: "/delivery-returns" },
  { icon: CreditCard, title: "Payments", text: "Cash on delivery and online payment", href: "/faq" },
  { icon: RotateCcw, title: "Returns & refunds", text: "7-day returns, refund timing", href: "/delivery-returns" },
  { icon: UserRound, title: "My account", text: "Profile, addresses and settings", href: "/user/dashboard" },
  { icon: MessageCircle, title: "Contact us", text: "Talk to our support team", href: "/contact" },
];

export default async function HelpPage() {
  const { supportEmail, supportPhone } = await getSiteSettings();
  const phone = supportPhone || contactConfig.company.phone;

  return (
    <InfoShell
      active="/help"
      title="Help center"
      intro={<p>How can we help? Pick a topic below or get in touch — we&apos;re happy to help.</p>}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {topics.map(({ icon: Icon, title, text, href }) => (
          <li key={title}>
            <Link
              href={href}
              className="group flex items-center gap-4 rounded-lg bg-white p-5 no-underline transition-shadow hover:shadow-[0_6px_24px_-12px_rgba(0,0,0,0.25)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream text-ink">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] text-ink">{title}</span>
                <span className="block text-sm text-light-color">{text}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-ink/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-lg bg-white p-6">
        <h2 className="text-2xl text-ink">Still need help?</h2>
        <p className="mt-2 text-base text-ink/80">{contactConfig.businessHours.weekday}</p>
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-base">
          {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          <Link href="/faq">Read the FAQs</Link>
        </div>
      </div>
    </InfoShell>
  );
}
