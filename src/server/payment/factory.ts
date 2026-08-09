import type { PaymentProvider } from "@/src/server/payment/interfaces";
import { ExternalPaymentProvider } from "@/src/server/payment/providers/external-payment";
import { MockPaymentProvider } from "@/src/server/payment/providers/mock-payment";
import type { PaymentRepository } from "@/src/server/repositories/payment.repository";
import { AppError } from "@/src/server/utils/errors";

/** mock = local/dev; external = production adapter boundary (real PSP module TBD). */
export type PaymentProviderKind = "mock" | "external";

/**
 * Selects a payment provider implementation.
 * Domain/checkout logic talks only to PaymentProvider — never a vendor SDK.
 */
export function createPaymentProvider(
  payments: PaymentRepository,
  kind: PaymentProviderKind = "mock",
): PaymentProvider {
  switch (kind) {
    case "mock":
      return new MockPaymentProvider(payments);
    case "external":
      return new ExternalPaymentProvider();
    default: {
      const _exhaustive: never = kind;
      throw new AppError(
        "CONFIG_ERROR",
        `Unsupported payment provider: ${String(_exhaustive)}`,
      );
    }
  }
}
