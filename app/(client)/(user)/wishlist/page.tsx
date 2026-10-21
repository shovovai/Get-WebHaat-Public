import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import Container from "@/components/Container";
import WishlistProducts from "@/components/WishlistProducts";
import { Breadcrumbs } from "@/components/listing/ProductBrowser";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishListPage() {
  const user = await currentUser();

  return (
    <Container className="py-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]} />
      <h1 className="mb-8 mt-6 text-[34px] leading-tight text-ink sm:text-[44px]">Wishlist</h1>
      {user ? (
        <WishlistProducts />
      ) : (
        <div className="rounded-lg bg-white px-6 py-20 text-center">
          <p className="text-[28px] text-ink">Sign in to see your wishlist</p>
          <p className="mt-2 text-base text-light-color">Your saved items stay with your account on every device.</p>
          <Link
            href="/sign-in?redirectTo=/wishlist"
            className="mt-8 inline-flex h-12 items-center rounded-md bg-ink px-8 text-base font-medium text-white"
          >
            Sign in
          </Link>
        </div>
      )}
    </Container>
  );
}
