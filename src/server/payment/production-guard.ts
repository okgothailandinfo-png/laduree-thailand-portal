import { isPreviewTestCatalogEnabled } from "@/lib/preview/preview-test-catalog";
import { isPublicPreview } from "@/lib/preview/public-preview";
import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

/**
 * Mock payment mutation endpoints (confirm/success/fail/cancel/refund) are
 * development/staging/prototype-only and require PAYMENT_PROVIDER=mock.
 * Production must use signed provider webhooks only.
 */
export function assertMockPaymentMutationsAllowed(): void {
  if (isPublicPreview()) {
    if (!isPreviewTestCatalogEnabled() || env.paymentProvider !== "mock") {
      throw new AppError(
        "FORBIDDEN",
        "Ordering is not available.",
        { status: 403, details: { code: "PREVIEW_COMMERCE_DISABLED" } },
      );
    }
    return;
  }
  if (env.isStrictProduction || !env.allowsMockProviders) {
    throw new AppError(
      "FORBIDDEN",
      "Mock payment mutation endpoints are disabled outside development/staging.",
    );
  }
  if (env.paymentProvider !== "mock") {
    throw new AppError(
      "FORBIDDEN",
      "Mock payment mutation endpoints require PAYMENT_PROVIDER=mock.",
    );
  }
}

export function assertMockWebhookAllowed(): void {
  if (isPublicPreview()) {
    if (!isPreviewTestCatalogEnabled() || env.paymentProvider !== "mock") {
      throw new AppError(
        "FORBIDDEN",
        "Ordering is not available.",
        { status: 403, details: { code: "PREVIEW_COMMERCE_DISABLED" } },
      );
    }
    return;
  }
  if (env.isStrictProduction || !env.allowsMockProviders) {
    throw new AppError(
      "FORBIDDEN",
      "Mock payment webhooks are disabled in production. Use a real payment provider webhook.",
    );
  }
  if (env.paymentProvider !== "mock") {
    throw new AppError(
      "FORBIDDEN",
      "Mock payment webhooks require PAYMENT_PROVIDER=mock.",
    );
  }
}
