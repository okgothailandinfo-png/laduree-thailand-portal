import { handleApi } from "@/src/server/api/handle";
import { created } from "@/src/server/api/responses";
import { paymentService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

/** @deprecated Prefer POST /api/payment/create */
export async function POST(request: Request) {
  return handleApi(async () => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const parsed = paymentService.parseCreatePaymentBody(raw);
    const accessToken = paymentService.resolveAccessToken(
      request,
      parsed.accessToken,
    );
    const data = await paymentService.createPayment({
      ...parsed,
      accessToken,
    });
    return created(data);
  }, request);
}
