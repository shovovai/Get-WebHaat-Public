import Link from "next/link";
import { Facebook, Instagram, Linkedin, Music2, Twitter, Youtube } from "lucide-react";
import Logo from "./common/Logo";
import { contactConfig } from "@/config/contact";
import { getCategories } from "@/sanity/queries";
import { getSiteSettings } from "@/lib/siteSeo";
import { getPaymentOptions } from "@/lib/paymentConfig";
import NewsletterForm from "./NewsletterForm";
import Container from "./Container";
import { InstallAppButton } from "./layout/FooterClient";
import { brand } from "@/config/brand";

type FooterLink = { title: string; href: string };

const PROVIDER_LABELS: Record<string, string[]> = {
  cash_on_delivery: ["Cash on delivery"],
  bkash: ["bKash"],
  nagad: ["Nagad"],
  rocket: ["Rocket"],
  upay: ["Upay"],
  bank: ["Bank transfer"],
  sslcommerz: ["SSLCommerz"],
  stripe: ["Visa", "Mastercard", "Amex"],
};

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Legal",
    links: [
      { title: "Terms & conditions", href: "/terms" },
      { title: "Privacy policy", href: "/privacy" },
      { title: "Delivery & returns", href: "/delivery-returns" },
    ],
  },
  {
    title: "Information",
    links: [
      { title: "Help center", href: "/help" },
      { title: "FAQs", href: "/faq" },
      { title: "Track my order", href: "/user/orders" },
      { title: "My account", href: "/user/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { title: "About us", href: "/about" },
      { title: "Contact us", href: "/contact" },
      { title: "Journal", href: "/blog" },
      { title: "Brands", href: "/brands" },
    ],
  },
];

const heading = "mb-6 text-sm tracking-[0.35em] text-light-color";

// Payment method marks for the "You can pay by" boxes
const PAY_STYLE: Record<string, string> = {
  Visa: "text-lg font-extrabold italic tracking-tight text-[#1a1f71]",
  Mastercard: "font-semibold text-[#eb001b]",
  Amex: "text-xs font-bold uppercase text-[#2e77bb]",
  bKash: "font-bold text-[#e2136e]",
  Nagad: "font-bold text-[#ec1c24]",
  Rocket: "font-bold text-[#8c3494]",
  Upay: "font-bold text-[#0a4da2]",
};

const Footer = async () => {
  const [settings, categories, paymentOptions] = await Promise.all([
    getSiteSettings(),
    getCategories().catch(() => []),
    getPaymentOptions().catch(() => []),
  ]);

  const storeName = settings.storeName;
  const phone = settings.supportPhone || contactConfig.company.phone;
  const email = settings.supportEmail || contactConfig.emails.support;

  const socials = [
    { label: "Facebook", href: settings.facebookUrl, icon: Facebook },
    { label: "Instagram", href: settings.instagramUrl, icon: Instagram },
    { label: "X (Twitter)", href: settings.twitterUrl, icon: Twitter },
    { label: "YouTube", href: settings.youtubeUrl, icon: Youtube },
    { label: "LinkedIn", href: settings.linkedinUrl, icon: Linkedin },
    { label: "TikTok", href: settings.tiktokUrl, icon: Music2 },
  ].filter((s) => s.href);

  const paymentLabels = [
    ...new Set(
      paymentOptions.flatMap((o) => PROVIDER_LABELS[o.kind === "manual" ? o.provider ?? "" : o.method] ?? [])
    ),
  ];

  // Dark "site map" panel: store categories, or the main shop pages while there are none
  const shopLinks: FooterLink[] = (categories ?? [])
    .filter((c: { title?: string; slug?: { current?: string } }) => c?.title && c?.slug?.current)
    .map((c: { title?: string; slug?: { current?: string } }) => ({
      title: c.title as string,
      href: `/category/${c.slug?.current}`,
    }));
  const sitemap: FooterLink[] = shopLinks.length
    ? shopLinks
    : [
        { title: "New In", href: "/shop" },
        { title: "All categories", href: "/category" },
        { title: "Sale", href: "/deal" },
        { title: "Brands", href: "/brands" },
        { title: "Wishlist", href: "/wishlist" },
        { title: "Shopping bag", href: "/cart" },
      ];

  return (
    <footer className="mt-12 sm:mt-16">
      {/* Subscribe */}
      <section className="bg-cream">
        <Container className="flex flex-col items-center py-14 text-center sm:py-16">
          <h2 className="max-w-xl text-[28px] leading-tight text-ink sm:text-4xl">Subscribe to get the latest updates</h2>
          <p className="mt-3 max-w-md text-[15px] text-light-color">
            New arrivals, restocks and members-only offers from {storeName}. No spam, unsubscribe any time.
          </p>
          <div className="mt-8 w-full max-w-xl text-left">
            <NewsletterForm tone="pill" />
          </div>
        </Container>
      </section>

      {/* Link columns */}
      <div className="bg-white">
        <Container className="grid grid-cols-2 gap-x-6 gap-y-12 py-16 md:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className={heading}>{col.title}</h3>
              <ul className="space-y-4 text-base">
                {col.links.map((link) => (
                  <li key={link.title}>
                    <Link href={link.href} className="text-ink underline underline-offset-4 hover:text-light-color">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className={heading}>Service center</h3>
            <ul className="space-y-4 text-base text-ink">
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                    {phone}
                  </a>
                </li>
              )}
              <li>
                <a href={`mailto:${email}`} className="break-all hover:underline">
                  {email}
                </a>
              </li>
              {socials.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 underline underline-offset-4 hover:text-light-color"
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {paymentLabels.length > 0 && (
            <div className="col-span-2 md:col-span-1">
              <h3 className={heading}>You can pay by</h3>
              <ul className="grid grid-cols-2 gap-2.5">
                {paymentLabels.map((label) => (
                  <li
                    key={label}
                    className={`flex h-10 items-center justify-center rounded-md border border-ink/80 px-2 text-center text-[13px] text-ink ${PAY_STYLE[label] ?? "font-medium"}`}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Container>

        <Container className="flex flex-col items-center gap-4 pb-10 pt-2 text-[15px] text-ink sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {brand.poweredBy.show && (
              <a
                href={brand.poweredBy.url}
                target="_blank"
                rel="noopener"
                className="text-xs text-ink/60 transition-colors hover:text-ink"
              >
                Powered by WebHaat
              </a>
            )}
            <InstallAppButton className="bg-ink px-3 py-1.5 text-xs text-white hover:bg-black" />
          </div>
        </Container>
      </div>

      {/* Site map */}
      <div className="bg-gradient-to-b from-[#2b2b2d] to-black text-white">
        <Container className="py-16">
          <section>
            <h2 className="mb-6 text-3xl text-white sm:text-4xl">Shop</h2>
            <div className="rounded-2xl bg-white/[0.07] p-6 sm:p-8">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                {sitemap.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-white/75 transition-colors hover:text-white">
                      {link.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Container>

        <div className="flex flex-col items-center gap-4 pb-20 pt-6">
          <div className="scale-150">
            <Logo variant="sm" inverted />
          </div>
          <p className="text-[11px] uppercase tracking-[0.5em] text-white/50">{storeName}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
