import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
  hashRateLimitSubject,
} from "@/src/server/http/rate-limit";
import { orderService } from "@/src/server/services/container";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/orders/[id]/completion
 * Customer pickup completion + digital receipt payload.
 */
export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    const { id } = await context.params;
    await assertRateLimit({
      bucket: "public-order-completion",
      subject: `${clientSubjectFromRequest(request)}:${hashRateLimitSubject(id)}`,
      maxAttempts: 60,
      windowMs: 60_000,
    });
    const data = await orderService.getOrderCompletion(id);
    return ok(data);
  }, request);
}
