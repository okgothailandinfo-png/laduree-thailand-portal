/**
 * Storefront payment methods — Sprint 24 allow-list.
 * Architecture stays provider-agnostic for future Thai gateways.
 */

export type PaymentMethodId = "credit-card" | "promptpay-qr";

export const PAYMENT_METHOD_IDS: readonly PaymentMethodId[] = [
  "credit-card",
  "promptpay-qr",
] as const;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodId, string> = {
  "credit-card": "Credit Card",
  "promptpay-qr": "PromptPay QR",
};

export function isPaymentMethodId(value: string): value is PaymentMethodId {
  return (PAYMENT_METHOD_IDS as readonly string[]).includes(value);
}

export function paymentMethodLabel(method: PaymentMethodId): string {
  return PAYMENT_METHOD_LABELS[method];
}
