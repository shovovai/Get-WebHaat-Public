import { memo } from "react";
import { twMerge } from "tailwind-merge";
import { formatPrice } from "@/lib/storeConfig";

interface Props {
  amount: number | undefined;
  className?: string;
}

const PriceFormatter = memo(({ amount, className }: Props) => {
  return (
    <span className={twMerge("text-sm font-semibold text-dark-color", className)}>
      {formatPrice(amount)}
    </span>
  );
});

PriceFormatter.displayName = "PriceFormatter";

export default PriceFormatter;
