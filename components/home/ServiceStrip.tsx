import Link from "next/link";
import { Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import Container from "../Container";
import { formatPrice } from "@/lib/storeConfig";

/** Four store promises under the hero */
export default function ServiceStrip({
  deliveryCharge,
  freeDeliveryOver,
  supportPhone,
}: {
  deliveryCharge: number;
  freeDeliveryOver: number;
  supportPhone?: string;
}) {
  const delivery =
    deliveryCharge <= 0
      ? "Free on every order"
      : freeDeliveryOver > 0
        ? `Free over ${formatPrice(freeDeliveryOver)}`
        : "Fast, tracked delivery";

  const items = [
    { icon: Truck, title: "Delivery", text: delivery, href: "/delivery-returns" },
    { icon: ShieldCheck, title: "Secure checkout", text: "Safe, encrypted payments", href: "/help" },
    { icon: RotateCcw, title: "Easy returns", text: "Simple, hassle-free process", href: "/delivery-returns" },
    { icon: Headphones, title: "Customer care", text: supportPhone || "We're here to help", href: "/contact" },
  ];

  return (
    <Container className="mt-6 sm:mt-8">
      <ul className="grid grid-cols-2 overflow-hidden rounded-md bg-white lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text, href }, i) => (
          <li
            key={title}
            className={[
              "border-black/[0.06]",
              i % 2 === 0 ? "border-r" : "",
              i < 2 ? "border-b lg:border-b-0" : "",
              i === 1 ? "lg:border-r" : "",
              i === 3 ? "lg:border-r-0" : "",
            ].join(" ")}
          >
            <Link href={href} className="group flex h-full flex-col items-center gap-2.5 px-3 py-5 text-center sm:flex-row sm:gap-4 sm:p-6 sm:text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink transition-colors group-hover:bg-ink group-hover:text-white sm:h-12 sm:w-12">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] text-ink sm:text-base">{title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-light-color sm:truncate sm:text-sm">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
