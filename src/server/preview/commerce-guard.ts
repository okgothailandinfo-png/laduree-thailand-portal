import { isPublicPreview, PUBLIC_PREVIEW_COMMERCE_CODE } from "@/lib/preview/public-preview";
import { AppError } from "@/src/server/utils/errors";

/**
 * Server-side commerce kill switch for APP_ENV=preview.
 * Client Unavailable/disabled ADD is not sufficient.
 */
export function assertPublicPreviewCommerceAllowed(
  appEnv: string | undefined = process.env.APP_ENV,
): void {
  if (!isPublicPreview(appEnv)) return;
  throw new AppError(
    "FORBIDDEN",
    "Ordering is not available.",
    {
      status: 403,
      details: { code: PUBLIC_PREVIEW_COMMERCE_CODE },
    },
  );
}
