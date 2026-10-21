"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ChevronUp, Mail, MessageCircle, MessageSquareText, MessagesSquare, Phone, X } from "lucide-react";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { cn } from "@/lib/utils";

/** Bottom-right corner: back-to-top button and a "chat with us" bubble */
export default function FloatingActions() {
  const pathname = usePathname();
  const { storeName, supportPhone, supportEmail, social } = useSiteSettings();
  const [showTop, setShowTop] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  // Pages with their own bottom action bar on phones keep the corner free
  const busyOnPhone = pathname.startsWith("/cart") || pathname.startsWith("/checkout");

  const digits = (supportPhone || "").replace(/[^\d]/g, "");
  const messengerPage = (() => {
    try {
      const u = new URL(social.facebook || "");
      const page = u.pathname.split("/").filter(Boolean)[0];
      return /facebook\.com$/.test(u.hostname.replace(/^www\./, "")) && page ? page : "";
    } catch {
      return "";
    }
  })();

  const options = [
    digits && {
      icon: MessageCircle,
      title: "WhatsApp",
      text: "Chat with us on WhatsApp",
      href: `https://wa.me/${digits}`,
      external: true,
    },
    messengerPage && {
      icon: MessagesSquare,
      title: "Messenger",
      text: "Message us on Facebook",
      href: `https://m.me/${messengerPage}`,
      external: true,
    },
    digits && { icon: Phone, title: "Call us", text: supportPhone, href: `tel:+${digits}`, external: false },
    supportEmail && { icon: Mail, title: "Email", text: supportEmail, href: `mailto:${supportEmail}`, external: false },
  ].filter(Boolean) as { icon: typeof Phone; title: string; text: string; href: string; external: boolean }[];

  return (
    <div
      className={cn(
        "fixed right-4 z-40 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6",
        "bottom-[calc(4rem+env(safe-area-inset-bottom)+0.9rem)]",
        busyOnPhone && "hidden lg:flex"
      )}
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink shadow-[0_6px_20px_-6px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-ink hover:text-white",
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        <ChevronUp className="h-5 w-5" strokeWidth={1.8} />
      </button>

      <div ref={panelRef} className="relative">
        <div
          className={cn(
            "absolute bottom-full right-0 mb-3 w-80 origin-bottom-right overflow-hidden rounded-xl bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)] transition-all duration-200",
            open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
          )}
          role="dialog"
          aria-label="Contact us"
        >
          <div className="flex items-start justify-between bg-ink p-5 text-white">
            <div>
              <p className="text-lg">Hi there</p>
              <p className="mt-1 text-sm text-white/70">How can the {storeName} team help you today?</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="-mr-1 -mt-1 p-1 text-white/70 hover:text-white" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <ul className="p-2">
            {options.map(({ icon: Icon, title, text, href, external }) => (
              <li key={title}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-cream"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-ink">{title}</span>
                    <span className="block truncate text-sm text-light-color">{text}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink/40" />
                </a>
              </li>
            ))}
            <li>
              <Link href="/contact" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg p-3 hover:bg-cream">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-ink">
                  <MessageSquareText className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-ink">Send a message</span>
                  <span className="block text-sm text-light-color">We reply as soon as we can</span>
                </span>
                <ChevronRight className="h-4 w-4 text-ink/40" />
              </Link>
            </li>
          </ul>
          <div className="border-t border-black/[0.06] px-5 py-3 text-sm">
            <Link href="/faq" onClick={() => setOpen(false)} className="text-ink underline underline-offset-4">
              Browse FAQs
            </Link>
          </div>
        </div>

        {/* Chat bubble */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close chat options" : "Chat with us"}
          className="group flex h-14 w-14 items-center justify-center rounded-[1.4rem] rounded-br-md bg-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] transition-transform hover:scale-105"
        >
          {open ? (
            <X className="h-6 w-6 text-ink" strokeWidth={1.6} />
          ) : (
            <span className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-ink/80 motion-safe:animate-bounce"
                  style={{ animationDelay: `${i * 150}ms`, animationDuration: "1.4s" }}
                />
              ))}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
