/**
 * Authoritative Order Review view model for Checkout and Payment.
 * Totals must come from trusted order / cart data only.
 */

import { formatPriceThb } from "@/lib/api/catalog";
import {
  computeOrderTotals,
  formatOrderTotalThb,
  type OrderTotalsView,
} from "./order-totals";

export type OrderReviewLineItem = {
  id: string;
  name: string;
  quantity: number;
  modifiersLabel: string;
};

export type OrderReviewCustomer = {
  customerName: string;
  email: string;
  mobileNumber: string;
};

export type OrderReviewPickup = {
  boutiqueName: string;
  boutiqueAddress: string;
  dateLabel: string;
  timeLabel: string;
};

export type OrderReviewDelivery = {
  fullAddress: string;
  modeLabel: string;
  dateLabel: string | null;
  windowLabel: string | null;
  notes: string | null;
  deliveryFeeThb: number | null;
};

export type OrderReviewModel = {
  serviceType: "PICKUP" | "DELIVERY";
  customer: OrderReviewCustomer;
  items: OrderReviewLineItem[];
  totals: OrderTotalsView;
  /** Trusted tax label only — never invent a numeric tax. */
  taxLabel: string;
  pickup: OrderReviewPickup | null;
  delivery: OrderReviewDelivery | null;
};

export function formatModifiersLabel(
  modifiers: Array<{ label: string; quantity?: number }>,
): string {
  if (modifiers.length === 0) return "";
  return modifiers
    .map((m) => (m.quantity ? `${m.quantity}× ${m.label}` : m.label))
    .join(", ");
}

export function buildOrderReviewTotals(input: {
  serviceType: "PICKUP" | "DELIVERY";
  subtotalThb: number | null;
  deliveryFeeThb?: number | null;
  trustedTotalThb?: number | null;
}): OrderTotalsView {
  return computeOrderTotals(input);
}

export function formatReviewMoney(value: number | null): string {
  return formatOrderTotalThb(value);
}

export function formatReviewFee(value: number | null): string {
  return formatPriceThb(value);
}

/** Tax is never invented — show placeholder until a trusted tax exists. */
export const TRUSTED_TAX_PLACEHOLDER = "฿ —";
