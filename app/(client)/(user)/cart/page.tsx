import type { Metadata } from "next";
import Container from "@/components/Container";
import CartView from "@/components/cart/CartView";
import { Breadcrumbs } from "@/components/listing/ProductBrowser";

export const metadata: Metadata = { title: "Shopping bag", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shopping bag" }]} />
      <h1 className="mb-8 mt-6 text-[34px] leading-tight text-ink sm:text-[44px]">Shopping bag</h1>
      <CartView />
    </Container>
  );
}
