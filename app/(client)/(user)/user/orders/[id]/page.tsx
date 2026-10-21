import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderById } from "@/sanity/queries";
import { auth, currentUser } from "@clerk/nextjs/server";
import OrderDetailsPage from "@/components/OrderDetailsPage";
import { brand } from "@/config/brand";

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// Links in older emails use the pre-migration id; scripts/migrate-private-ids.ts moved those
// orders to "private.order.<oldId>".
async function findOrder(id: string) {
  const order = await getOrderById(id);
  if (order || id.includes(".")) return order;
  return getOrderById(`private.order.${id}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Only the owner sees the order number in the title; nothing about the order leaks otherwise
  const [{ id }, { userId }] = await Promise.all([params, auth()]);
  const order = userId ? await findOrder(id) : null;

  if (!order || order.clerkUserId !== userId) {
    return { title: `Order details - ${brand.name}`, robots: { index: false, follow: false } };
  }

  return {
    title: `Order ${order.orderNumber} - ${brand.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailsPageRoute({ params }: Props) {
  const user = await currentUser();
  const { id } = await params;

  if (!user) {
    notFound();
  }

  const order = await findOrder(id);

  if (!order) {
    notFound();
  }

  // Security check: ensure user can only view their own orders
  if (order.clerkUserId !== user.id) {
    notFound();
  }

  return (
    <div className="w-full">
      <OrderDetailsPage order={order} />
    </div>
  );
}
