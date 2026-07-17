import type { PaymentProvider } from "@/src/server/payment/interfaces";
import { MockPaymentProvider } from "@/src/server/payment/providers/mock-payment";

export type PaymentProviderKind = "mock";

/**
 * Selects a payment provider implementation.
 * Real gateways (Omise, Stripe, etc.) are intentionally not wired yet.
 */
export function createPaymentProvider(
  kind: PaymentProviderKind = "mock",
): PaymentProvider {
  switch (kind) {
    case "mock":
      return new MockPaymentProvider();
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
