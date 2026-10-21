import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

// Section header: large title on the left, underlined "Explore all" link on the right
const SectionHeading = ({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Explore All",
  className,
  children,
}: Props) => (
  <div className={cn("mb-7 flex items-end justify-between gap-4 sm:mb-9", className)}>
    <div className="min-w-0">
      {eyebrow && (
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.3em] text-light-color">{eyebrow}</p>
      )}
      <h2 className="text-[28px] leading-tight text-ink sm:text-4xl lg:text-[2.6rem]">{title}</h2>
      {description && <p className="mt-2 text-sm text-light-color sm:text-base">{description}</p>}
    </div>
    <div className="flex shrink-0 items-center gap-3">
      {children}
      {href && (
        <Link
          href={href}
          className="whitespace-nowrap pb-1 text-sm font-medium text-ink underline underline-offset-4 hover:text-light-color"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  </div>
);

export default SectionHeading;
