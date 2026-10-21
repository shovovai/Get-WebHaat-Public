import type { Metadata } from "next";
import Link from "next/link";
import InfoShell from "@/components/info/InfoShell";
import { getSiteSettings } from "@/lib/siteSeo";
import { formatPrice } from "@/lib/storeConfig";
import { jsonLd } from "@/lib/jsonLd";

export const metadata: Metadata = {
  title: "FAQs",
  description: "Answers to common questions about orders, delivery, payment, returns and your account.",
};

export default async function FaqPage() {
  const { deliveryCharge, freeDeliveryOver, supportEmail } = await getSiteSettings();

  const delivery =
    deliveryCharge <= 0
      ? "Delivery is free on every order."
      : freeDeliveryOver > 0
        ? `A delivery charge of ${formatPrice(deliveryCharge)} applies to each order, and delivery is free for orders of ${formatPrice(freeDeliveryOver)} or more.`
        : `A delivery charge of ${formatPrice(deliveryCharge)} applies to each order.`;

  const groups: { title: string; items: { q: string; a: string }[] }[] = [
    {
      title: "Orders",
      items: [
        { q: "How do I place an order?", a: "Add products to your bag, open the bag and choose Checkout. Pick your address and payment method, then place the order." },
        { q: "Can I change or cancel my order?", a: "You can request a cancellation from My orders before the order ships. Our team confirms it and refunds any payment." },
        { q: "How do I track my order?", a: "Open My orders in your account to see the latest status and delivery updates." },
      ],
    },
    {
      title: "Delivery",
      items: [
        { q: "How much does delivery cost?", a: `${delivery} The exact amount is shown in your bag before you order.` },
        { q: "How long does delivery take?", a: "Most orders arrive within 2–5 working days. We message you when your order ships." },
      ],
    },
    {
      title: "Payment",
      items: [
        { q: "Which payment methods can I use?", a: "Cash on delivery and the online methods shown at checkout (for example bKash, Nagad or cards)." },
        { q: "Is paying online safe?", a: "Yes. Payments are processed by secure gateways over encrypted connections, and we never store your card number." },
      ],
    },
    {
      title: "Returns & refunds",
      items: [
        { q: "What is your return policy?", a: "Eligible items can be returned within 7 days of delivery if unused and in their original packaging." },
        { q: "When will I get my refund?", a: "Within 5–10 working days after we receive the returned item — to your original payment method or store wallet." },
      ],
    },
    {
      title: "Account",
      items: [
        { q: "Do I need an account to order?", a: "Yes — an account lets you track orders, save addresses and keep a wishlist. Signing up takes a minute." },
        { q: "How do I delete my account?", a: "Go to Account → Settings → Delete account. You can also download your data there first." },
      ],
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) =>
      g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } }))
    ),
  };

  return (
    <InfoShell active="/faq" title="Frequently asked questions">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-2 text-2xl text-ink">{group.title}</h2>
            <div className="border-t border-black/10">
              {group.items.map((item) => (
                <details key={item.q} className="group border-b border-black/10">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[17px] text-ink [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="text-2xl leading-none text-ink/50 transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-6 text-base leading-8 text-ink/75">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-12 text-base text-ink/80">
        Still need help? <Link href="/contact">Contact us</Link> or email{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>
    </InfoShell>
  );
}
