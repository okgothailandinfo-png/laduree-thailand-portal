import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
  hashRateLimitSubject,
} from "@/src/server/http/rate-limit";
import { assertOrderAccess } from "@/src/server/orders/order-access-token";
import { pickupVerificationService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/orders/[id]/pickup
 * Customer confirmation credentials (QR payload + short pickup code).
 * Requires capability token. Never logs raw tokens or codes.
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
    assertOrderAccess(request, id, "pickup");
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
