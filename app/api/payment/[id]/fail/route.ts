import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { assertMockPaymentMutationsAllowed } from "@/src/server/payment/production-guard";
import { paymentService } from "@/src/server/services/container";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  return handleApi(async () => {
    assertMockPaymentMutationsAllowed();
    await assertRateLimit({
      bucket: "payment-mutate",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 30,
      windowMs: 60_000,
    });
    const { id } = await context.params;
    const data = await paymentService.confirmPayment(id, "FAILED");
    return ok(data);
  }, request);
}
