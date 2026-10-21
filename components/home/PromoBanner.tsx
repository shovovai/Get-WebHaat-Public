import Link from "next/link";
import Container from "../Container";
import { sanityImgProps } from "@/lib/sanityImage";

const PROMO_WIDTHS = [320, 480, 640, 900] as const;
/** Photo panel is ~710px wide on desktop; the main photo takes 2/3 (all of it when alone) */
const MAIN_SIZES = "(min-width: 1024px) 470px, 67vw";
const SOLO_SIZES = "(min-width: 1024px) 710px, 100vw";
const SIDE_SIZES = "(min-width: 1024px) 235px, 33vw";

/** Wide campaign block: dark copy panel beside a photo collage */
export default function PromoBanner({
  eyebrow,
  title,
  text,
  href,
  cta,
  images,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  images: string[];
}) {
  if (!images.length) return null;
  const [main, ...rest] = images;

  return (
    <Container className="mt-16 sm:mt-24">
      <Link
        href={href}
        className="group grid overflow-hidden rounded-md bg-ink text-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]"
      >
        <div className="relative flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <p className="text-[12px] font-medium uppercase tracking-[0.3em] text-white/60">{eyebrow}</p>
          <h2 className="mt-3 text-4xl leading-[1.05] text-white sm:text-5xl lg:text-6xl">{title}</h2>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">{text}</p>
          <span className="mt-8 inline-flex h-12 w-fit items-center gap-3 rounded-md bg-white px-7 text-[15px] font-medium text-ink transition-colors group-hover:bg-sand">
            {cta}
            <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
        <div className="grid h-72 grid-cols-3 gap-1 sm:h-96 lg:h-[30rem]">
          <div className={rest.length ? "col-span-2 overflow-hidden" : "col-span-3 overflow-hidden"}>
            <img
              {...sanityImgProps(main, { widths: PROMO_WIDTHS, sizes: rest.length ? MAIN_SIZES : SOLO_SIZES })}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105" />
          </div>
          {rest.length > 0 && (
            <div className="grid gap-1" style={{ gridTemplateRows: `repeat(${Math.min(rest.length, 2)}, minmax(0, 1fr))` }}>
              {rest.slice(0, 2).map((src) => (
                <div key={src} className="overflow-hidden">
                  <img
                    {...sanityImgProps(src, { widths: PROMO_WIDTHS, sizes: SIDE_SIZES })}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Link>
    </Container>
  );
}
