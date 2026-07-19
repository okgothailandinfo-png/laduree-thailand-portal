import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { assertMockPaymentMutationsAllowed } from "@/src/server/payment/production-guard";
import { paymentService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

export async function POST(request: Request) {
  return handleApi(async () => {
    assertMockPaymentMutationsAllowed();
    await assertRateLimit({
      bucket: "payment-mutate",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 30,
      windowMs: 60_000,
    });

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const input = paymentService.parseConfirmPaymentBody(raw);
    const data = await paymentService.confirmPayment(
      input.paymentId,
      input.result,
    );
    return ok(data);
  }, request);
}
