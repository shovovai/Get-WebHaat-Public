import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import Container from "@/components/Container";
import CheckoutView from "@/components/checkout/CheckoutView";
import { OrderCheckoutContent } from "@/components/checkout/OrderCheckoutContent";
import { getOrderById } from "@/sanity/queries";
import { getCheckoutPaymentOptions } from "@/lib/paymentMethods";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

interface Props {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const { orderId } = await searchParams;

  // Paying for an existing, unpaid order
  if (orderId) {
    const user = await currentUser();
    if (!user) notFound();
    const order = await getOrderById(orderId);
    if (!order || order.clerkUserId !== user.id) notFound();

    return (
      <Container className="py-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">Almost there</p>
        <h1 className="mb-8 mt-2 text-[34px] leading-tight text-ink sm:text-[44px]">Complete your payment</h1>
        <OrderCheckoutContent
          order={order}
          paymentOptions={(await getCheckoutPaymentOptions()).filter((o) => o.method !== "cash_on_delivery")}
        />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">Secure checkout</p>
      <h1 className="mb-8 mt-2 text-[34px] leading-tight text-ink sm:text-[44px]">Checkout</h1>
      <CheckoutView />
    </Container>
  );
}
