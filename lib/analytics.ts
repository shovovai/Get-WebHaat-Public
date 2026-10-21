// Centralized browser event tracking. Events go to Google Analytics 4 through
// `window.gtag` (loaded by components/SiteAnalytics.tsx when a GA4 ID is set in
// Admin → SEO & Branding), or to the Tag Manager `dataLayer` when only GTM is
// configured. Without either, every call is a silent no-op — no SDK is bundled.

import { storeConfig } from "@/lib/storeConfig";

type EventParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: EventParams) => void;
    dataLayer?: unknown[];
  }
}

function send(eventName: string, params: EventParams) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...params });
    }
  } catch {
    /* analytics must never break the page */
  }
}

/** GA4 ecommerce item for one product line */
const gaItem = (p: { productId: string; name: string; price?: number; quantity?: number; category?: string }) => ({
  item_id: p.productId,
  item_name: p.name,
  ...(p.category && { item_category: p.category }),
  ...(p.price !== undefined && { price: p.price }),
  ...(p.quantity !== undefined && { quantity: p.quantity }),
});

// Types for event parameters
type AddToCartParams = {
  productId: string;
  name: string;
  price: number;
  /** Quantity in the bag after the change */
  quantity: number;
  userId?: string;
};

type RemoveFromCartParams = AddToCartParams;

type OrderPlacedParams = {
  orderId: string;
  amount: number;
  status: string;
  userId?: string;
};

type OrderStatusUpdateParams = {
  orderId: string;
  status: string;
  userId?: string;
};

type UserRegistrationParams = {
  userId: string;
  email: string;
};

type UserLoginParams = UserRegistrationParams;

type ProductViewParams = {
  productId: string;
  name: string;
  userId?: string;
};

/** Send any event (no-op when GA4/GTM is not configured) */
export function trackEvent(
  eventName: string,
  eventParams: Record<
    string,
    string | number | boolean | undefined | unknown[]
  > = {}
) {
  send(eventName, eventParams);
}

// E-commerce specific events (GA4 recommended event names and shapes)
export function trackAddToCart({ productId, name, price, quantity }: AddToCartParams) {
  send("add_to_cart", {
    currency: storeConfig.currency,
    value: price,
    items: [gaItem({ productId, name, price, quantity: 1 })],
    cart_quantity: quantity,
  });
}

export function trackRemoveFromCart({ productId, name, price, quantity }: RemoveFromCartParams) {
  send("remove_from_cart", {
    currency: storeConfig.currency,
    value: price,
    items: [gaItem({ productId, name, price, quantity: 1 })],
    cart_quantity: quantity,
  });
}

export function trackOrderPlaced(params: OrderPlacedParams) {
  trackEvent("order_placed", params);
}

export function trackOrderStatusUpdate(params: OrderStatusUpdateParams) {
  trackEvent("order_status_update", params);
}

// Email addresses are personal data and must not be sent to Google Analytics
export function trackUserRegistration({ userId }: UserRegistrationParams) {
  trackEvent("sign_up", { user_id: userId });
}

export function trackUserLogin({ userId }: UserLoginParams) {
  trackEvent("login", { user_id: userId });
}

export function trackProductView({ productId, name }: ProductViewParams) {
  send("view_item", {
    currency: storeConfig.currency,
    items: [gaItem({ productId, name })],
  });
}

// Additional e-commerce tracking functions
export function trackCartView(userId?: string) {
  trackEvent("view_cart", { user_id: userId });
}

export function trackCheckoutStarted(params: {
  userId?: string;
  cartValue: number;
  itemCount: number;
}) {
  send("begin_checkout", {
    currency: storeConfig.currency,
    value: params.cartValue,
    item_count: params.itemCount,
  });
}

export function trackSearchPerformed(params: {
  searchTerm: string;
  userId?: string;
  resultCount?: number;
}) {
  trackEvent("search", { search_term: params.searchTerm, results_count: params.resultCount });
}

export function trackCategoryView(params: {
  categoryId: string;
  categoryName: string;
  userId?: string;
}) {
  trackEvent("view_item_list", {
    item_list_id: params.categoryId,
    item_list_name: params.categoryName,
  });
}

export function trackWishlistAdd(params: {
  productId: string;
  name: string;
  userId?: string;
}) {
  send("add_to_wishlist", {
    currency: storeConfig.currency,
    items: [gaItem(params)],
  });
}

export function trackWishlistRemove(params: {
  productId: string;
  name: string;
  userId?: string;
}) {
  send("remove_from_wishlist", { items: [gaItem(params)] });
}

export function trackPageView(params: {
  pagePath: string;
  pageTitle?: string;
  userId?: string;
}) {
  trackEvent("page_view", { page_path: params.pagePath, page_title: params.pageTitle });
}

// Advanced e-commerce tracking
export function trackPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  items: Array<{
    productId: string;
    name: string;
    category?: string;
    quantity: number;
    price: number;
  }>;
  userId?: string;
}) {
  send("purchase", {
    transaction_id: params.orderId,
    value: params.value,
    currency: params.currency || storeConfig.currency,
    items: params.items.map(gaItem),
  });
}

export function trackBestSellingProducts(params: {
  products: Array<{
    productId: string;
    name: string;
    category?: string;
    salesCount: number;
    revenue: number;
  }>;
  timeframe: string; // e.g., "weekly", "monthly"
}) {
  trackEvent("best_selling_products", params);
}

export function trackOrderDetails(params: {
  orderId: string;
  orderNumber: string;
  status: string;
  value: number;
  itemCount: number;
  paymentMethod: string;
  shippingMethod?: string;
  userId?: string;
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}) {
  trackEvent("order_details", params);
}

export function trackOrderFullfillment(params: {
  orderId: string;
  status: string;
  previousStatus: string;
  value: number;
  fulfillmentTime?: number; // in hours/days
  userId?: string;
}) {
  trackEvent("order_fulfillment", params);
}

export function trackInventoryAction(params: {
  productId: string;
  name: string;
  action: "restock" | "low_stock" | "out_of_stock";
  currentStock: number;
  previousStock?: number;
}) {
  trackEvent("inventory_action", params);
}

/**
 * Track customer lifetime analytics
 */
export function trackCustomerLifetime(
  userId: string,
  totalSpent: number,
  orderCount: number,
  avgOrderValue: number
) {
  send("customer_lifetime_value", {
    user_id: userId,
    total_spent: totalSpent,
    order_count: orderCount,
    average_order_value: avgOrderValue,
    ltv_segment:
      totalSpent > 1000
        ? "high_value"
        : totalSpent > 500
        ? "medium_value"
        : "low_value",
  });
}

/**
 * Track product search events
 */
export function trackProductSearch(
  searchTerm: string,
  resultsCount: number,
  category?: string,
  filters?: Record<string, string | number | boolean>
) {
  send("search", {
    search_term: searchTerm,
    results_count: resultsCount,
    category: category || "all",
    filters: JSON.stringify(filters || {}),
  });
}

/**
 * Track category view events with enhanced data
 */
export function trackCategoryViewEnhanced(
  categoryName: string,
  categoryId: string,
  productCount: number
) {
  send("view_item_list", {
    item_list_id: categoryId,
    item_list_name: categoryName,
    items_count: productCount,
    list_type: "category",
  });
}

/**
 * Track enhanced user registration events
 */
export function trackUserRegistrationEnhanced(
  userId: string,
  registrationMethod: "email" | "google" | "facebook" | "other"
) {
  send("sign_up", { method: registrationMethod, user_id: userId });
}

/**
 * Track enhanced user login events
 */
export function trackUserLoginEnhanced(
  userId: string,
  loginMethod: "email" | "google" | "facebook" | "other"
) {
  send("login", { method: loginMethod, user_id: userId });
}
