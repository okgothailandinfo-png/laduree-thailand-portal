import { readCartIdFromCookie } from "@/src/server/api/cart-session";
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
import { checkoutService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

export async function POST(request: Request) {
  return handleApi(async () => {
    await assertRateLimit({
      bucket: "checkout",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 20,
      windowMs: 60_000,
    });

    const idempotencyKey = readIdempotencyKey(request);
    if (idempotencyKey) {
      const cached = await getIdempotentResponse<unknown>(
        "checkout",
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

    const cartId = await readCartIdFromCookie();
    const input = checkoutService.parseCheckoutBody(raw);
    const data = await checkoutService.createDraftCheckout(cartId, input);

    if (idempotencyKey) {
      await saveIdempotentResponse("checkout", idempotencyKey, data);
    }

    return created(data);
  }, request);
}
