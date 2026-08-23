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

/**
 * Server-side commerce kill switch for APP_ENV=preview.
 * Checkout, payment, orders, and delivery stay blocked even in test-catalog mode.
 * Client Unavailable/disabled ADD is not sufficient.
 */
export function assertPublicPreviewCommerceAllowed(
  appEnv: string | undefined = process.env.APP_ENV,
): void {
  if (!isPublicPreview(appEnv)) return;
  previewCommerceForbidden();
}

/**
 * Cart add/update may run in preview only when PREVIEW_TEST_CATALOG=true.
 * Checkout, payment capture, fulfillment, and delivery remain blocked.
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
    return;
  }
  previewCommerceForbidden();
}
