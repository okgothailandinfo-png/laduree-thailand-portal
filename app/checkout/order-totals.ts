/**
 * Consistent order totals for Cart, Checkout, Payment, and Confirmation.
 * Delivery fee is included only for DELIVERY when a trusted fee is present.
 */

import { formatPriceThb } from "@/lib/api/catalog";

export type OrderTotalsInput = {
  serviceType: "PICKUP" | "DELIVERY";
  /** Cart / items subtotal in THB major units. */
  subtotalThb: number | null;
  /** Delivery fee in THB major units when known. */
  deliveryFeeThb?: number | null;
  /**
   * When set (e.g. server order.totalThb), used as authoritative Total.
   * Subtotal is then derived as total − fee for Delivery when possible.
   */
  trustedTotalThb?: number | null;
};

export type OrderTotalsView = {
  subtotalThb: number | null;
  deliveryFeeThb: number | null;
  totalThb: number | null;
};

export function computeOrderTotals(input: OrderTotalsInput): OrderTotalsView {
  const fee =
    input.serviceType === "DELIVERY" &&
    typeof input.deliveryFeeThb === "number" &&
    Number.isFinite(input.deliveryFeeThb)
      ? input.deliveryFeeThb
      : null;

  if (
    typeof input.trustedTotalThb === "number" &&
    Number.isFinite(input.trustedTotalThb)
  ) {
    const total = input.trustedTotalThb;
    const subtotal =
      typeof input.subtotalThb === "number" && Number.isFinite(input.subtotalThb)
        ? input.subtotalThb
        : fee !== null
          ? Math.round((total - fee) * 100) / 100
          : total;
    return {
      subtotalThb: subtotal,
      deliveryFeeThb: fee,
      totalThb: total,
    };
  }

  const subtotal =
    typeof input.subtotalThb === "number" && Number.isFinite(input.subtotalThb)
      ? input.subtotalThb
      : null;

  if (subtotal === null) {
    return { subtotalThb: null, deliveryFeeThb: fee, totalThb: null };
  }

  return {
    subtotalThb: subtotal,
    deliveryFeeThb: fee,
    totalThb: Math.round((subtotal + (fee ?? 0)) * 100) / 100,
  };
}

export function formatOrderTotalThb(value: number | null): string {
  return formatPriceThb(value);
}
