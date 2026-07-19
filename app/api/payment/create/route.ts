import { handleApi } from "@/src/server/api/handle";
import { created } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { paymentService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

export async function POST(request: Request) {
  return handleApi(async () => {
    await assertRateLimit({
      bucket: "payment-create",
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

    const input = paymentService.parseCreatePaymentBody(raw);
    const data = await paymentService.createPayment(input.orderId);
    return created(data);
  }, request);
}
