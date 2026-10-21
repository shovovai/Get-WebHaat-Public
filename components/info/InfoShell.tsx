import Link from "next/link";
import { ReactNode } from "react";
import Container from "../Container";
import { cn } from "@/lib/utils";

export const INFO_PAGES = [
  { title: "About us", href: "/about" },
  { title: "Delivery & returns", href: "/delivery-returns" },
  { title: "Terms & conditions", href: "/terms" },
  { title: "Privacy policy", href: "/privacy" },
  { title: "FAQs", href: "/faq" },
  { title: "Help center", href: "/help" },
  { title: "Contact us", href: "/contact" },
] as const;

/** Policy/information page: side menu of all info pages + title + content */
export default function InfoShell({
  active,
  title,
  intro,
  children,
}: {
  active: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Container className="py-8 lg:py-12">
      <div className="grid gap-8 lg:grid-cols-[296px_minmax(0,1fr)] lg:gap-14">
        {/* Menu: scrolling chips on phones, card on desktop */}
        <nav aria-label="Information pages" className="-mx-4 overflow-x-auto px-4 scrollbar-hide lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-2 lg:sticky lg:top-28 lg:flex-col lg:gap-0 lg:rounded-xl lg:border lg:border-black/15 lg:p-8">
            {INFO_PAGES.map((p) => {
              const on = p.href === active;
              return (
                <li key={p.href} className="shrink-0 lg:border-b lg:border-black/10 lg:last:border-0">
                  <Link
                    href={p.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap rounded-full px-4 py-2 text-[15px] transition-colors lg:my-1.5 lg:rounded-md lg:px-4 lg:py-3.5 lg:text-lg",
                      on ? "bg-ink text-white" : "bg-white text-light-color hover:text-ink lg:bg-transparent"
                    )}
                  >
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <article className="min-w-0">
          <h1 className="text-[34px] leading-tight text-ink sm:text-[44px]">{title}</h1>
          {intro && <div className="mt-6 text-base leading-8 text-ink/80">{intro}</div>}
          <div className="info-prose mt-8">{children}</div>
        </article>
      </div>
    </Container>
  );
}

/** One titled block of an info page */
export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-black/10 py-8 first:border-0 first:pt-0">
      <h2 className="mb-4 text-2xl text-ink">{title}</h2>
      <div className="space-y-4 text-base leading-8 text-ink/80">{children}</div>
    </section>
  );
}
