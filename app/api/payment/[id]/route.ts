import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { paymentService } from "@/src/server/services/container";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return handleApi(async () => {
    await assertRateLimit({
      bucket: "payment-get",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 60,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const accessToken = paymentService.resolveAccessToken(request);
    const data = await paymentService.getPayment(id, accessToken);
    return ok(data);
  }, request);
}
