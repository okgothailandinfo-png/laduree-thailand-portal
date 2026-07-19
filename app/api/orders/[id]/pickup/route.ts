import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
  hashRateLimitSubject,
} from "@/src/server/http/rate-limit";
import { pickupVerificationService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/orders/[id]/pickup
 * Customer confirmation credentials (QR payload + short pickup code).
 * Never logs raw tokens or codes.
 * Production Blocker: add capability-token / signed-link access control.
 */
export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { id } = await context.params;
    await assertRateLimit({
      bucket: "public-order-pickup",
      subject: `${clientSubjectFromRequest(request)}:${hashRateLimitSubject(id)}`,
      maxAttempts: 30,
      windowMs: 60_000,
    });
    const data = await pickupVerificationService.getCustomerCredentials(id);
    if (!data) {
      throw new AppError(
        "NOT_FOUND",
        "Pickup credentials are not available for this order.",
      );
    }
    return ok(data);
  }, request);
}
