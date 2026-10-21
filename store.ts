import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toCartProduct, type CartProduct, type ProductLike } from "./lib/cartProduct";

export { toCartProduct, type CartProduct, type ProductLike };

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

interface StoreState {
  items: CartItem[];
  addItem: (product: ProductLike) => void;
  addMultipleItems: (
    products: Array<{ product: ProductLike; quantity: number }>
  ) => void;
  removeItem: (productId: string) => void;
  deleteCartProduct: (productId: string) => void;
  resetCart: () => void;
  getTotalPrice: () => number;
  getSubTotalPrice: () => number;
  getTotalDiscount: () => number;
  getItemCount: (productId: string) => number;
  getGroupedItems: () => CartItem[];
  // favorite
  favoriteProduct: CartProduct[];
  addToFavorite: (product: ProductLike) => Promise<void>;
  removeFromFavorite: (productId: string) => void;
  resetFavorite: () => void;
  // order placement state
  isPlacingOrder: boolean;
  orderStep: "validating" | "creating" | "emailing" | "redirecting";
  setOrderPlacementState: (
    isPlacing: boolean,
    step?: "validating" | "creating" | "emailing" | "redirecting"
  ) => void;
}

type PersistedState = Pick<StoreState, "items" | "favoriteProduct">;

/** Slim carts saved by older versions (full Sanity documents) and drop broken entries */
function migrateCart(persisted: unknown): PersistedState {
  const state = (persisted ?? {}) as { items?: unknown; favoriteProduct?: unknown };
  const isProduct = (p: unknown): p is ProductLike =>
    !!p && typeof (p as ProductLike)._id === "string";
  const items = Array.isArray(state.items)
    ? state.items
        .filter(
          (i): i is { product: ProductLike; quantity: number } =>
            !!i && isProduct(i.product) && typeof i.quantity === "number" && i.quantity > 0
        )
        .map((i) => ({ product: toCartProduct(i.product), quantity: i.quantity }))
    : [];
  const favoriteProduct = Array.isArray(state.favoriteProduct)
    ? state.favoriteProduct.filter(isProduct).map(toCartProduct)
    : [];
  return { items, favoriteProduct };
}

const useCartStore = create<StoreState>()(
  persist(
    (set, get) => ({
      items: [],
      favoriteProduct: [],
      addItem: (product) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product._id === product._id
          );
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product._id === product._id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          } else {
            return {
              items: [...state.items, { product: toCartProduct(product), quantity: 1 }],
            };
          }
        }),
      addMultipleItems: (products) =>
        set((state) => {
          let updatedItems = [...state.items];

          products.forEach(({ product, quantity }) => {
            const existingItem = updatedItems.find(
              (item) => item.product._id === product._id
            );

            if (existingItem) {
              updatedItems = updatedItems.map((item) =>
                item.product._id === product._id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              );
            } else {
              updatedItems.push({ product: toCartProduct(product), quantity });
            }
          });

          return { items: updatedItems };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.reduce((acc: CartItem[], item) => {
            if (item.product._id === productId) {
              if (item.quantity > 1) {
                acc.push({ ...item, quantity: item.quantity - 1 });
              }
            } else {
              acc.push(item);
            }
            return acc;
          }, []),
        })),
      deleteCartProduct: (productId) =>
        set((state) => ({
          items: state.items.filter(({ product }) => product?._id !== productId),
        })),
      resetCart: () => set({ items: [] }),
      getTotalPrice: () => {
        // This should be the final payable amount (current/discounted prices)
        return get().items.reduce(
          (total, item) => total + (item.product.price ?? 0) * item.quantity,
          0
        );
      },
      getSubTotalPrice: () => {
        // This should be the gross amount (before discount)
        return get().items.reduce((total, item) => {
          const currentPrice = item.product.price ?? 0;
          const discount = item.product.discount ?? 0;
          const discountAmount = (discount * currentPrice) / 100;
          const grossPrice = currentPrice + discountAmount;
          return total + grossPrice * item.quantity;
        }, 0);
      },
      getTotalDiscount: () => {
        // New function to get total discount amount
        return get().items.reduce((total, item) => {
          const currentPrice = item.product.price ?? 0;
          const discount = item.product.discount ?? 0;
          const discountAmount = (discount * currentPrice) / 100;
          return total + discountAmount * item.quantity;
        }, 0);
      },
      getItemCount: (productId) => {
        const item = get().items.find((item) => item.product._id === productId);
        return item ? item.quantity : 0;
      },
      getGroupedItems: () => get().items,
      addToFavorite: (product) => {
        return new Promise<void>((resolve) => {
          set((state: StoreState) => {
            const isFavorite = state.favoriteProduct.some(
              (item) => item._id === product._id
            );
            return {
              favoriteProduct: isFavorite
                ? state.favoriteProduct.filter((item) => item._id !== product._id)
                : [...state.favoriteProduct, toCartProduct(product)],
            };
          });
          resolve();
        });
      },
      removeFromFavorite: (productId: string) => {
        set((state: StoreState) => ({
          favoriteProduct: state.favoriteProduct.filter(
            (item) => item?._id !== productId
          ),
        }));
      },
      resetFavorite: () => {
        set({ favoriteProduct: [] });
      },
      // order placement state
      isPlacingOrder: false,
      orderStep: "validating" as const,
      setOrderPlacementState: (isPlacing, step = "validating") => {
        set({
          isPlacingOrder: isPlacing,
          orderStep: step,
        });
      },
    }),
    {
      name: "cart-store",
      // v1: items/favorites hold CartProduct instead of full Sanity documents
      version: 1,
      partialize: (state): PersistedState => ({
        items: state.items,
        favoriteProduct: state.favoriteProduct,
      }),
      migrate: (persisted) => migrateCart(persisted) as StoreState,
    }
  )
);

export default useCartStore;
