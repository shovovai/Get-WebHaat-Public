"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, useClerk, useUser } from "@clerk/nextjs";
import { UserRound } from "lucide-react";
import HoverPanel from "./HoverPanel";
import { isUserAdmin } from "@/lib/adminUtils";

const link = "block rounded-md px-3 py-2 text-[15px] text-ink hover:bg-cream";

/** Account icon with a hover menu: sign in / create account, or account links */
export default function AccountMenu() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = isUserAdmin(user?.primaryEmailAddress?.emailAddress);

  return (
    <HoverPanel
      label="Account"
      panelClassName="w-72 p-4"
      trigger={
        <Link
          href={user ? "/user/dashboard" : `/sign-in?redirectTo=${encodeURIComponent(pathname)}`}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-sand"
          aria-label="Account"
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <UserRound className="h-[22px] w-[22px]" strokeWidth={1.6} />
          )}
        </Link>
      }
    >
      <SignedOut>
        <p className="text-lg text-ink">Welcome</p>
        <p className="mt-1 text-sm text-light-color">Sign in to track orders and save favourites.</p>
        <div className="mt-4 grid gap-2">
          <Link
            href={`/sign-in?redirectTo=${encodeURIComponent(pathname)}`}
            className="flex h-11 items-center justify-center rounded-md bg-ink text-[15px] font-medium text-white hover:bg-black"
          >
            Sign in
          </Link>
          <Link
            href={`/sign-up?redirectTo=${encodeURIComponent(pathname)}`}
            className="flex h-11 items-center justify-center rounded-md border border-ink text-[15px] font-medium text-ink hover:bg-ink hover:text-white"
          >
            Create account
          </Link>
        </div>
        <div className="mt-3 border-t border-black/10 pt-3">
          <Link href="/user/orders" className={link}>Track my order</Link>
          <Link href="/help" className={link}>Help center</Link>
        </div>
      </SignedOut>
      <SignedIn>
        <p className="truncate px-3 text-lg text-ink">Hi, {user?.firstName || "there"}</p>
        <p className="truncate px-3 text-sm text-light-color">{user?.primaryEmailAddress?.emailAddress}</p>
        <div className="mt-3 border-t border-black/10 pt-2">
          <Link href="/user/dashboard" className={link}>My account</Link>
          <Link href="/user/orders" className={link}>My orders</Link>
          <Link href="/wishlist" className={link}>Wishlist</Link>
          <Link href="/user/settings" className={link}>Settings</Link>
          {isAdmin && (
            <Link href="/admin" className={link}>Admin panel</Link>
          )}
        </div>
        <div className="mt-2 border-t border-black/10 pt-2">
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full rounded-md px-3 py-2 text-left text-[15px] text-light-color hover:bg-cream hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </SignedIn>
    </HoverPanel>
  );
}
