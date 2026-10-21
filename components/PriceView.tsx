import PriceFormatter from "./PriceFormatter";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { now: "text-[15px]", was: "text-[15px]" },
  md: { now: "text-lg", was: "text-lg font-normal" },
  lg: { now: "text-xl sm:text-2xl", was: "text-xl font-normal sm:text-2xl" },
} as const;

interface Props {
  price: number | undefined;
  discount: number | undefined;
  /** sm: lists, md: product cards, lg: product page */
  size?: keyof typeof SIZES;
  /** Hide the "-10%" pill where the discount is already shown (e.g. card image badge) */
  showBadge?: boolean;
  /** Extra classes for the current price only */
  className?: string;
}

const PriceView = ({ price, discount: rawDiscount, size = "md", showBadge = true, className }: Props) => {
  // Guard against bad data (e.g. 600 entered instead of 6)
  const discount = rawDiscount && rawDiscount > 0 && rawDiscount < 100 ? rawDiscount : 0;
  // `price` is what the customer pays; the struck-through price is price + discount
  const currentPrice = price || 0;
  const grossPrice = discount ? currentPrice + (discount * currentPrice) / 100 : 0;

  return (
    // Wraps onto a second line on narrow screens instead of spilling into the next card
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <PriceFormatter
        amount={currentPrice}
        className={cn("whitespace-nowrap font-semibold text-ink", SIZES[size].now, className)}
      />
      {grossPrice > 0 && (
        <PriceFormatter
          amount={grossPrice}
          className={cn("whitespace-nowrap font-normal text-ink/60 line-through", SIZES[size].was)}
        />
      )}
      {grossPrice > 0 && showBadge && (
        <span className={cn("shrink-0 whitespace-nowrap font-medium text-sale", SIZES[size].was)}>
          {discount}% OFF
        </span>
      )}
    </div>
  );
};

export default PriceView;
