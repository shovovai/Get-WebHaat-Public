"use client";
import { cn } from "@/lib/utils";
import useCartStore, { type CartProduct } from "@/store";
import { Heart } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

const ProductSideMenu = ({
  product,
  className,
}: {
  product: CartProduct;
  className?: string;
}) => {
  const { favoriteProduct, addToFavorite } = useCartStore();
  const [existingProduct, setExistingProduct] = useState<CartProduct | null>(null);

  useEffect(() => {
    const availableItem = favoriteProduct.find(
      (item) => item?._id === product?._id
    );
    setExistingProduct(availableItem || null);
  }, [product, favoriteProduct]);

  const handleFavorite = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.preventDefault();
    if (product?._id) {
      addToFavorite(product).then(() => {
        toast.success(
          existingProduct ? "Removed from wishlist" : "Added to wishlist",
          {
            description: existingProduct
              ? "Product removed successfully!"
              : "Product added successfully!",
            duration: 3000,
          }
        );
      });
    }
  };
  return (
    <div className={cn("absolute top-3 right-3", className)}>
      <div
        onClick={handleFavorite}
        role="button"
        aria-label={existingProduct ? "Remove from wishlist" : "Add to wishlist"}
        className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm hoverEffect ${existingProduct ? "bg-clay text-white" : "bg-white text-ink hover:text-clay"}`}
      >
        <Heart size={16} className={existingProduct ? "fill-current" : ""} />
      </div>
    </div>
  );
};

export default ProductSideMenu;
