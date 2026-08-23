import { isPreviewTestCatalogEnabled } from "@/lib/preview/preview-test-catalog";
import { isPublicPreview, PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
import { AppError } from "@/src/server/utils/errors";

function previewCommerceForbidden(): never {
  throw new AppError(
    "FORBIDDEN",
    "Ordering is not available.",
    {
      status: 403,
      details: { code: PUBLIC_PREVIEW_COMMERCE_CODE },
    },
  );
}

function assertPreviewUsesMockDataSource(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isPublicPreview(env.APP_ENV)) return;
  if (env.DATA_SOURCE?.trim().toLowerCase() === "prisma") {
    previewCommerceForbidden();
  }
}

/**
 * Server-side commerce kill switch for APP_ENV=preview.
 * Delivery and legacy place-order stay blocked even in test-catalog mode.
 * Sprint 34E opens PICKUP checkout + mock payment only via
 * assertPublicPreviewCheckoutPaymentAllowed.
 */
export function assertPublicPreviewCommerceAllowed(
  appEnv: string | undefined = process.env.APP_ENV,
): void {
  if (!isPublicPreview(appEnv)) return;
  previewCommerceForbidden();
}

/**
 * Cart add/update may run in preview only when PREVIEW_TEST_CATALOG=true.
 * Checkout, payment capture, fulfillment, and delivery remain blocked
 * unless a more specific Sprint 34E allow-list applies.
 */
export function assertPublicPreviewCartMutationsAllowed(
  appEnv: string | undefined = process.env.APP_ENV,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isPublicPreview(appEnv)) return;
  if (
    isPreviewTestCatalogEnabled({
      ...env,
      APP_ENV: appEnv,
    })
  ) {
    assertPreviewUsesMockDataSource({ ...env, APP_ENV: appEnv });
    return;
  }
  previewCommerceForbidden();
}

/**
 * Sprint 34E — PICKUP draft checkout + mock payment only.
 * Requires APP_ENV=preview AND PREVIEW_TEST_CATALOG=true.
 * Production ignores the catalog flag. Delivery stays on the hard kill switch.
 */
export function assertPublicPreviewCheckoutPaymentAllowed(
  appEnv: string | undefined = process.env.APP_ENV,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isPublicPreview(appEnv)) return;
  if (
    isPreviewTestCatalogEnabled({
      ...env,
      APP_ENV: appEnv,
    })
  ) {
    assertPreviewUsesMockDataSource({ ...env, APP_ENV: appEnv });
    return;
  }
  previewCommerceForbidden();
}
