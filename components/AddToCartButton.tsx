"use client";
import { useEffect, useState, memo, useCallback } from "react";
import { toast } from "sonner";
import PriceFormatter from "./PriceFormatter";
import { Button } from "./ui/button";
import useCartStore, { type CartProduct } from "@/store";
import QuantityButtons from "./QuantityButtons";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import { trackAddToCart } from "@/lib/analytics";

interface Props {
  product: CartProduct;
  className?: string;
  /** Small overlay style used on product cards */
  compact?: boolean;
  /** "icon": small round button; "square": white square bag button on product cards */
  variant?: "bar" | "icon" | "square";
}

const AddToCartButton = memo(({ product, className, compact = false, variant = "bar" }: Props) => {
  const { addItem, getItemCount } = useCartStore();
  const [isClient, setIsClient] = useState(false);

  // All hooks must be called before any conditional logic
  const itemCount = getItemCount(product?._id);
  const isOutOfStock = product?.stock === 0;

  // Use useEffect to set isClient to true after component mounts
  // This ensures that the component only renders on the client-side
  // Preventing hydration errors due to server/client mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddToCart = useCallback(() => {
    if ((product?.stock as number) > itemCount) {
      addItem(product);
      toast.success(`${product?.name} added to your bag`, {
        description: `Current quantity: ${itemCount + 1}`,
        duration: 3000,
      });
      trackAddToCart({
        productId: product._id,
        name: product.name || "Unknown",
        price: product.price ?? 0,
        quantity: itemCount + 1,
      });
    } else {
      toast.error("Stock limit reached", {
        description: "Cannot add more than available stock",
        duration: 4000,
      });
    }
  }, [product, itemCount, addItem]);

  // Early return after all hooks have been called - this is crucial for Rules of Hooks
  if (compact && variant === "square") {
    if (!isClient) return <div className="h-12 w-12" />;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleAddToCart();
        }}
        disabled={isOutOfStock}
        aria-label={isOutOfStock ? "Sold out" : `Add ${product?.name} to bag`}
        className={`relative flex h-12 w-12 items-center justify-center rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-colors disabled:opacity-40 ${
          itemCount ? "bg-ink text-white" : "bg-white text-ink hover:bg-ink hover:text-white"
        }`}
      >
        {itemCount ? (
          <span className="text-sm font-semibold">{itemCount}</span>
        ) : (
          <ShoppingBag className="h-5 w-5" strokeWidth={1.6} />
        )}
      </button>
    );
  }

  if (compact && variant === "icon") {
    if (!isClient) return <div className="h-10 w-10" />;
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleAddToCart();
        }}
        disabled={isOutOfStock}
        aria-label={isOutOfStock ? "Out of stock" : `Add ${product?.name} to cart`}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-transform active:scale-90 disabled:opacity-40 ${
          itemCount ? "bg-ink text-white" : "bg-white/95 text-ink backdrop-blur"
        }`}
      >
        {itemCount ? <span className="text-xs font-semibold">{itemCount}</span> : <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />}
      </button>
    );
  }

  if (compact) {
    if (!isClient) return <div className="h-10" />;
    return itemCount ? (
      <div className="flex h-10 items-center justify-between rounded-full bg-white/95 px-3 shadow-md backdrop-blur">
        <span className="text-xs font-semibold text-ink">In cart</span>
        <QuantityButtons product={product} />
      </div>
    ) : (
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isOutOfStock}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white/95 text-sm font-medium text-ink shadow-sm backdrop-blur transition-colors hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <ShoppingBag className="h-4 w-4" />
        {isOutOfStock ? "Sold out" : "Add to bag"}
      </button>
    );
  }

  if (!isClient) {
    return (
      <div className="w-full h-12 flex items-center">
        <Button
          disabled
          className={cn(
            "w-full bg-gray-200 text-gray-500 shadow-none border border-gray-300",
            className
          )}
        >
          <ShoppingBag /> Loading...
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-12 flex items-center">
      {itemCount ? (
        <div className="text-sm w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Quantity</span>
            <QuantityButtons product={product} />
          </div>
          <div className="flex items-center justify-between border-t pt-1">
            <span className="text-xs font-semibold">Subtotal</span>
            <PriceFormatter
              amount={product?.price ? product.price * itemCount : 0}
            />
          </div>
        </div>
      ) : (
        <Button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={cn(
            "w-full rounded-md bg-ink text-white shadow-none border border-ink font-medium hover:bg-black hoverEffect",
            className
          )}
        >
          <ShoppingBag /> {isOutOfStock ? "Sold out" : "Add to bag"}
        </Button>
      )}
    </div>
  );
});

AddToCartButton.displayName = "AddToCartButton";

export default AddToCartButton;
