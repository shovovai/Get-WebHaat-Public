"use client";
import useCartStore from "@/store";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

const CartIcon = () => {
  const { items } = useCartStore();
  const itemCount = items?.length || 0;
  const displayCount = itemCount > 9 ? "9+" : itemCount;

  return (
    <Link href={"/cart"} className="group relative">
      <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.6} />
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">
          {displayCount}
        </span>
      )}
    </Link>
  );
};

export default CartIcon;
