"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useCartStore from "@/store";
import type { PaymentOption } from "@/lib/paymentConfig";

export interface QuotePricing {
  lines: { productId: string; name: string; unitPrice: number; quantity: number; lineTotal: number }[];
  subtotal: number;
  businessDiscount: number;
  coupon: { code: string; amount: number } | null;
  couponError?: string;
  discountTotal: number;
  shipping: number;
  /** Amount still needed for free delivery (0 when free or not offered) */
  freeDeliveryLeft?: number;
  tax: number;
  total: number;
  currency: string;
}

const COUPON_KEY = "webhaat-coupon";

/** Coupon code kept for the browser session so it follows cart → checkout */
export function useCouponCode() {
  const [code, setCode] = useState("");
  useEffect(() => {
    try {
      setCode(sessionStorage.getItem(COUPON_KEY) || "");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const update = useCallback((value: string) => {
    const v = value.trim().toUpperCase();
    setCode(v);
    try {
      if (v) sessionStorage.setItem(COUPON_KEY, v);
      else sessionStorage.removeItem(COUPON_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);
  return [code, update] as const;
}

/**
 * Server-calculated totals for the current cart (prices, discounts, coupon,
 * shipping, tax). Refetches when the cart or coupon changes.
 */
export function useCheckoutQuote(couponCode: string, paymentOptionId = "") {
  const items = useCartStore((s) => s.items);
  const [pricing, setPricing] = useState<QuotePricing | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const key = items.map((i) => `${i.product._id}:${i.quantity}`).join("|");

  useEffect(() => {
    if (!items.length) {
      setPricing(null);
      setError(null);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
            couponCode: couponCode || undefined,
            paymentOptionId: paymentOptionId || undefined,
          }),
        });
        const data = await res.json();
        if (id !== requestId.current) return;
        if (!res.ok) {
          setError(data.error || "Could not calculate totals");
          setPricing(null);
        } else {
          setError(null);
          setPricing(data.pricing);
          setPaymentOptions(data.paymentOptions || []);
        }
      } catch {
        if (id === requestId.current) setError("Network error — please retry");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [key, couponCode, paymentOptionId]);

  return { items, pricing, paymentOptions, error, loading };
}
