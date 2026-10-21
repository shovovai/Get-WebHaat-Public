"use client";
import useCartStore, { type CartProduct } from "@/store";
import { Heart } from "lucide-react";
import BreadcrumbLink from "@/components/BreadcrumbLink";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import isArray from "js-isarray";
import { trackWishlistAdd, trackWishlistRemove } from "@/lib/analytics";

const FavoriteButton = ({
  showProduct = false,
  product,
}: {
  showProduct?: boolean;
  product?: CartProduct;
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
      const isRemoving = !!existingProduct;

      addToFavorite(product).then(() => {
        toast.success(
          isRemoving ? "Removed from wishlist" : "Added to wishlist",
          {
            description: isRemoving
              ? "Product removed successfully!"
              : "Product added successfully!",
            duration: 3000,
          }
        );

        // Track wishlist analytics
        if (isRemoving) {
          trackWishlistRemove({
            productId: product._id,
            name: product.name || "Unknown Product",
          });
        } else {
          trackWishlistAdd({
            productId: product._id,
            name: product.name || "Unknown Product",
          });
        }
      });
    }
  };
  return (
    <>
      {!showProduct ? (
        <BreadcrumbLink
          href={"/wishlist"}
          className="group relative hover:text-shop_light_green hoverEffect"
        >
          <Heart className="h-[22px] w-[22px]" strokeWidth={1.6} />
          {isArray(favoriteProduct) && favoriteProduct.length > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-semibold text-white">
              {favoriteProduct.length > 9 ? "9+" : favoriteProduct.length}
            </span>
          )}
        </BreadcrumbLink>
      ) : (
        <button
          onClick={handleFavorite}
          className="group relative hover:text-shop_light_green hoverEffect border border-shop_light_green/80 p-1.5 rounded-sm "
        >
          <Heart
            fill={existingProduct ? "#0a0a0a" : "#fff"}
            className="text-shop_light_green/80 group-hover:text-shop_light_green hoverEffect mt-.5"
          />
        </button>
      )}
    </>
  );
};

export default FavoriteButton;
