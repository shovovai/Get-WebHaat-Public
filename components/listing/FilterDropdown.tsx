"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  label: string;
  value: string;
}

interface Props {
  label: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Show "label: selected" in the button (used for Sort) */
  showValue?: boolean;
  align?: "left" | "right";
  allowClear?: boolean;
}

/** Outlined dropdown button with a list of options */
export default function FilterDropdown({ label, options, value, onChange, showValue, align = "left", allowClear = true }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex h-10 min-w-[7.5rem] items-center justify-between gap-3 rounded-md border bg-white px-4 text-[15px] text-ink transition-colors",
          value && !showValue ? "border-ink" : "border-black/15 hover:border-ink/60"
        )}
      >
        <span className="whitespace-nowrap">
          {showValue ? (
            <>
              <span className="text-light-color">{label}:</span> {selected?.label ?? "Default"}
            </>
          ) : (
            <>
              {label}
              {selected && <span className="ml-1.5 text-light-color">· {selected.label}</span>}
            </>
          )}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-30 mt-2 max-h-80 min-w-full overflow-y-auto rounded-md border border-black/10 bg-white py-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.25)]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {allowClear && value && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="w-full whitespace-nowrap px-4 py-2 text-left text-sm text-light-color underline underline-offset-4 hover:text-ink"
              >
                Clear
              </button>
            </li>
          )}
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-6 whitespace-nowrap px-4 py-2 text-left text-[15px] text-ink hover:bg-sand"
              >
                {o.label}
                {o.value === value && <Check className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
