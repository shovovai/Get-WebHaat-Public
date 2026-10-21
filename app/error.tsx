"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-cream px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">Something went wrong</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink">We hit a snag.</h1>
        <p className="mt-3 text-sm leading-relaxed text-light-color">
          This page couldn&apos;t load right now. Please try again — if it keeps happening, contact
          support and mention the code below.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-light-color">Error code: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-clay"
          >
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
