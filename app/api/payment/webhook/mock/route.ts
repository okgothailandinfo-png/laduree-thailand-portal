import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import {
  assertRateLimit,
  clientSubjectFromRequest,
  hashRateLimitSubject,
} from "@/src/server/http/rate-limit";
import { assertMockWebhookAllowed } from "@/src/server/payment/production-guard";
import { paymentService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";
import { logEvent } from "@/src/server/utils/logger";

/**
 * Mock payment webhook.
 * Signature header: X-Mock-Payment-Signature: t=<unix>,v1=<hmac_sha256_hex>
 * Body is verified but never logged in full.
 */
export async function POST(request: Request) {
  return handleApi(async () => {
    assertMockWebhookAllowed();
    await assertRateLimit({
      bucket: "payment-webhook",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 60,
      windowMs: 60_000,
    });

    const rawBody = await request.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody) as unknown;
    } catch {
      logEvent.paymentWebhookRejected({ reason: "invalid_json" });
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    const signatureHeader = request.headers.get("x-mock-payment-signature");
    try {
      const data = await paymentService.handleMockWebhook({
        rawBody,
        signatureHeader,
        parsedBody: parsed,
      });
      return ok(data);
    } catch (error) {
      logEvent.paymentWebhookRejected({
        reason: error instanceof AppError ? error.code : "unknown",
        signatureFingerprint: signatureHeader
          ? hashRateLimitSubject(signatureHeader)
          : undefined,
      });
      throw error;
    }
  }, request);
}
