import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

/**
 * Mock payment mutation endpoints (confirm/success/fail/cancel/refund) are
 * development/staging-only. Production must use signed provider webhooks only.
 */
export function assertMockPaymentMutationsAllowed(): void {
  if (env.isStrictProduction || !env.allowsMockProviders) {
    throw new AppError(
      "FORBIDDEN",
      "Mock payment mutation endpoints are disabled outside development/staging.",
    );
  }
}

export function assertMockWebhookAllowed(): void {
  if (env.isStrictProduction || !env.allowsMockProviders) {
    throw new AppError(
      "FORBIDDEN",
      "Mock payment webhooks are disabled in production. Use a real payment provider webhook.",
    );
  }
}
