import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { cn } from "@/lib/utils";

const NoProductAvailable = ({
  selectedTab,
  className,
}: {
  selectedTab?: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl border border-dashed border-border bg-white/60 px-6 py-16 text-center",
        className
      )}
    >
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-sand text-clay">
        <PackageSearch className="h-7 w-7" />
      </span>
      <h3 className="font-display text-2xl text-ink">Nothing here yet</h3>
      <p className="mt-2 max-w-sm text-sm text-light-color">
        {selectedTab
          ? `We don't have anything in ${selectedTab} right now. Check back soon or browse the rest of the store.`
          : "No products match these filters. Try removing a filter or browse all products."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream hover:bg-clay">
          Browse all products
        </Link>
        <Link href="/category" className="rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink">
          View categories
        </Link>
      </div>
    </div>
  );
};

export default NoProductAvailable;
