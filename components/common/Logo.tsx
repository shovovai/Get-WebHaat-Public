"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";

interface Props {
  className?: string;
  variant?: "default" | "sm";
  /** Use on dark backgrounds */
  inverted?: boolean;
}

// WebHaat mark: a market-stall awning over a basket
export const LogoMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden="true">
    <rect width="40" height="40" rx="11" className="fill-clay" />
    <path
      d="M8 15.5 11 9h18l3 6.5c0 2-1.6 3.5-3.5 3.5S25 17.5 25 15.5c0 2-1.6 3.5-3.5 3.5h-3c-1.9 0-3.5-1.5-3.5-3.5 0 2-1.6 3.5-3.5 3.5S8 17.5 8 15.5Z"
      className="fill-cream"
    />
    <path
      d="M11 21.5h18l-1.6 8.3a2 2 0 0 1-2 1.7H14.6a2 2 0 0 1-2-1.7L11 21.5Z"
      className="fill-cream"
    />
    <path
      d="M16 24.5v4M20 24.5v4M24 24.5v4"
      className="stroke-clay"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const Logo = ({ className, variant = "default", inverted = false }: Props) => {
  const small = variant === "sm";
  const { storeName, siteLogoUrl } = useSiteSettings();

  // Uploaded logo (Admin → SEO & Branding) replaces the built-in mark + wordmark
  if (siteLogoUrl) {
    return (
      <Link href="/" aria-label={`${storeName} home`} className={cn("inline-flex items-center", className)}>
        <img
          src={siteLogoUrl}
          alt={storeName}
          className={cn("w-auto object-contain", small ? "h-8" : "h-9 sm:h-10", inverted && "brightness-0 invert")}
        />
      </Link>
    );
  }

  const split = storeName.match(/^(Web)(Haat)$/i);
  return (
    <Link
      href="/"
      aria-label={`${storeName} home`}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <LogoMark
        className={cn(
          "transition-transform duration-300 group-hover:-rotate-6",
          small ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
        )}
      />
      <span
        className={cn(
          "font-display font-semibold leading-none tracking-tight",
          small ? "text-xl" : "text-2xl sm:text-[1.7rem]",
          inverted ? "text-cream" : "text-ink"
        )}
      >
        {split ? (
          <>
            {split[1]}
            <span className="italic text-clay">{split[2]}</span>
          </>
        ) : (
          storeName
        )}
      </span>
    </Link>
  );
};

export default Logo;
