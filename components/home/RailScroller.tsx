"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Container from "../Container";
import SectionHeading from "../SectionHeading";

interface Props {
  title: ReactNode;
  href?: string;
  linkLabel?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}

/** Section title + horizontally scrolling row with arrow buttons (desktop) and swipe (phones) */
export default function RailScroller({ title, href, linkLabel, eyebrow, children, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      setCanPrev(el.scrollLeft > 4);
      setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    const frame = requestAnimationFrame(update);
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const go = (dir: number) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow =
    "flex h-11 w-11 items-center justify-center rounded-md bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-opacity hover:bg-ink hover:text-white disabled:pointer-events-none disabled:opacity-35";

  return (
    <Container className={className ?? "mt-16 sm:mt-24"}>
      <SectionHeading title={title} href={href} linkLabel={linkLabel} eyebrow={eyebrow}>
        <div className={canPrev || canNext ? "hidden gap-2 sm:flex" : "hidden"}>
          <button type="button" onClick={() => go(-1)} disabled={!canPrev} className={arrow} aria-label="Previous">
            <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
          </button>
          <button type="button" onClick={() => go(1)} disabled={!canNext} className={arrow} aria-label="Next">
            <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>
      </SectionHeading>
      <div
        ref={trackRef}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide sm:gap-5"
      >
        {children}
      </div>
    </Container>
  );
}
