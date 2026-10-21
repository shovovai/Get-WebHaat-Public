"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Opens a dropdown on hover (desktop) or tap, with a small delay so it doesn't flicker */
export default function HoverPanel({
  trigger,
  children,
  className,
  panelClassName,
  label,
}: {
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const later = (value: boolean, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(value), ms);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onMouseEnter={() => later(true, 90)}
      onMouseLeave={() => later(false, 160)}
      onFocus={() => later(true, 0)}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) later(false, 0);
      }}
    >
      <div aria-haspopup="true" aria-expanded={open} aria-label={label}>
        {trigger}
      </div>
      <div
        className={cn(
          "absolute right-0 top-full z-50 pt-3 transition-all duration-200",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
        )}
      >
        <div
          className={cn(
            "rounded-lg border border-black/[0.06] bg-white shadow-[0_18px_48px_-18px_rgba(0,0,0,0.3)]",
            panelClassName
          )}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
