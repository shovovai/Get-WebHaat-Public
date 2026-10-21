"use client";

import Link from "next/link";
import type { MenuSection } from "@/lib/menuData";
import { cn } from "@/lib/utils";
import Container from "../Container";

/** Full-width dropdown: section list on the left, links + photo tiles on the right */
export default function MegaMenu({
  sections,
  activeKey,
  onActivate,
  onNavigate,
}: {
  sections: MenuSection[];
  activeKey: string;
  onActivate: (key: string) => void;
  onNavigate: () => void;
}) {
  const active = sections.find((s) => s.key === activeKey) ?? sections[0];
  if (!active) return null;

  return (
    <div className="border-t border-black/[0.06] bg-white" onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate()}>
      <div className="grid min-h-[26rem] grid-cols-[320px_minmax(0,1fr)]">
        {/* Section list */}
        <ul className="max-h-[32rem] overflow-y-auto bg-cream py-6">
          {sections.map((s) => (
            <li key={s.key}>
              <Link
                href={s.href}
                onMouseEnter={() => onActivate(s.key)}
                onFocus={() => onActivate(s.key)}
                className={cn(
                  "block px-10 py-3 text-[17px] transition-colors",
                  s.key === active.key ? "font-medium text-ink underline underline-offset-4" : "text-light-color hover:text-ink"
                )}
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ul>

        {/* Active section */}
        <Container className="w-full py-10 lg:px-14">
          <h3 className="border-b border-black/10 pb-4 text-2xl text-ink">{active.title}</h3>
          <div className="mt-5 grid grid-cols-[220px_minmax(0,1fr)] gap-10">
            <ul className="space-y-1">
              {active.links.map((l) => (
                <li key={l.href + l.title}>
                  <Link href={l.href} className="block py-1.5 text-[15px] text-ink hover:underline hover:underline-offset-4">
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
            {active.tiles.length > 0 ? (
              <div className="grid grid-cols-3 gap-6">
                {active.tiles.map((t) => (
                  <Link key={t.href} href={t.href} className="group relative block aspect-[4/5] overflow-hidden rounded-md bg-sand">
                    <img
                      src={t.image}
                      alt=""
                      width={440}
                      height={550}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 line-clamp-2 p-5 text-xl leading-tight text-white">
                      {t.title}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                href={active.href}
                className="flex items-center justify-center rounded-md bg-cream text-lg text-ink underline underline-offset-4"
              >
                Browse {active.title.toLowerCase()}
              </Link>
            )}
          </div>
        </Container>
      </div>
    </div>
  );
}
