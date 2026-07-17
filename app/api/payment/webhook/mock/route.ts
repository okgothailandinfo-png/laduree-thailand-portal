import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { paymentService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

/**
 * Mock payment webhook.
 * Signature header: X-Mock-Payment-Signature: t=<unix>,v1=<hmac_sha256_hex>
 * Body is verified but never logged in full.
 */
export async function POST(request: Request) {
  return handleApi(async () => {
    const rawBody = await request.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody) as unknown;
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const signatureHeader = request.headers.get("x-mock-payment-signature");
    const data = await paymentService.handleMockWebhook({
      rawBody,
      signatureHeader,
      parsedBody: parsed,
    });
    return ok(data);
  });
}
