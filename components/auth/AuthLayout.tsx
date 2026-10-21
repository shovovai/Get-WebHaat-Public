import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import Logo from "../common/Logo";

/** Shared frame for sign-in / sign-up: logo, back link, title and the Clerk form */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto grid h-16 max-w-(--breakpoint-xl) grid-cols-[1fr_auto_1fr] items-center px-4">
          <Link href="/" className="flex items-center gap-2 text-[15px] text-ink hover:underline">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
            <span className="hidden sm:inline">Back to store</span>
          </Link>
          <Logo />
          <span />
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <h1 className="text-center text-[34px] leading-tight text-ink sm:text-[40px]">{title}</h1>
          <p className="mt-2 text-center text-base text-light-color">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-light-color">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/** Clerk styling that matches the store */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#0a0a0a",
    colorText: "#0a0a0a",
    colorTextSecondary: "#6e6e73",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#0a0a0a",
    borderRadius: "0.375rem",
    fontFamily: "inherit",
    fontSize: "15px",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: {
      width: "100%",
      maxWidth: "100%",
      boxShadow: "none",
      border: "1px solid rgba(0,0,0,0.08)",
      borderRadius: "0.75rem",
    },
    headerTitle: { fontSize: "1.25rem", fontWeight: 500 },
    formButtonPrimary: { height: "3rem", fontSize: "15px", fontWeight: 500, textTransform: "none", boxShadow: "none" },
    formFieldInput: { height: "3rem", fontSize: "16px" },
    socialButtonsBlockButton: { height: "3rem" },
    footerActionLink: { color: "#0a0a0a", fontWeight: 600, textDecoration: "underline" },
  },
} as const;
