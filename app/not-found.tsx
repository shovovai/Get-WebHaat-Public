import Link from "next/link";
import Logo from "@/components/common/Logo";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cream px-4 py-16">
      <div className="max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-10 font-display text-7xl leading-none text-clay">404</p>
        <h1 className="mt-4 font-display text-3xl leading-tight text-ink">
          This stall is empty.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-light-color">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-clay"
          >
            Back to home
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            Browse the shop
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-light-color transition-colors hover:text-ink"
          >
            Help center
          </Link>
        </div>
      </div>
    </div>
  );
}
