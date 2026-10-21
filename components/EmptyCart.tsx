import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function EmptyCart() {
  return (
    <div className="rounded-lg bg-white px-6 py-20 text-center">
      <ShoppingBag className="mx-auto h-12 w-12 text-ink" strokeWidth={1.2} />
      <h2 className="mt-6 text-[28px] text-ink">Your bag is empty</h2>
      <p className="mx-auto mt-2 max-w-sm text-base text-light-color">
        Nothing here yet — explore the latest arrivals and add your favourites.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/shop"
          className="inline-flex h-12 items-center rounded-md bg-ink px-8 text-base font-medium text-white hover:bg-black"
        >
          Start shopping
        </Link>
        <Link
          href="/wishlist"
          className="inline-flex h-12 items-center rounded-md border border-ink px-8 text-base font-medium text-ink hover:bg-ink hover:text-white"
        >
          View wishlist
        </Link>
      </div>
    </div>
  );
}
