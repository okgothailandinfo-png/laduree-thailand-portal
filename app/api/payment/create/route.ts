import { handleApi } from "@/src/server/api/handle";
import { created, ok } from "@/src/server/api/responses";
import {
  getIdempotentResponse,
  readIdempotencyKey,
  saveIdempotentResponse,
} from "@/src/server/http/idempotency";
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

    const idempotencyKey = readIdempotencyKey(request);
    if (idempotencyKey) {
      const cached = await getIdempotentResponse<unknown>(
        "payment-create",
        idempotencyKey,
      );
      if (cached) {
        return ok(cached);
      }
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const parsed = paymentService.parseCreatePaymentBody(raw);
    const accessToken = await paymentService.resolveAccessToken(
      request,
      parsed.accessToken,
      parsed.orderId,
    );
    const data = await paymentService.createPayment({
      ...parsed,
      accessToken,
    });

    if (idempotencyKey) {
      await saveIdempotentResponse("payment-create", idempotencyKey, data);
    }

    return created(data);
  }, request);
}
