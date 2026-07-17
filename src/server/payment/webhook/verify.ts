import { createHmac, timingSafeEqual } from "crypto";
import { AppError } from "@/src/server/utils/errors";

export type WebhookVerifyOptions = {
  secret: string;
  /** Maximum age of the signed timestamp in seconds. */
  toleranceSeconds: number;
  /** Current time in seconds (injectable for tests). */
  nowSeconds?: number;
};

/**
 * Provider-neutral HMAC verification.
 * Signature header format: `t=<unix_seconds>,v1=<hex_hmac_sha256>`
 * Signed payload: `${t}.${rawBody}`
 */
export function parseSignatureHeader(header: string | null): {
  timestamp: number;
  signature: string;
} {
  if (!header?.trim()) {
    throw new AppError("VALIDATION_ERROR", "Missing webhook signature.", {
      details: { field: "signature" },
    });
  }

  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t" && value) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) timestamp = parsed;
    }
    if (key === "v1" && value) signature = value.trim().toLowerCase();
  }

  if (timestamp === null || !signature) {
    throw new AppError("VALIDATION_ERROR", "Invalid webhook signature header.", {
      details: { field: "signature" },
    });
  }

  return { timestamp, signature };
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  options: WebhookVerifyOptions,
): void {
  const secret = options.secret.trim();
  if (!secret) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Webhook secret is not configured.",
      { status: 500 },
    );
  }

  const { timestamp, signature } = parseSignatureHeader(signatureHeader);
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);
  if (age > options.toleranceSeconds) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Webhook timestamp is outside the allowed tolerance.",
      { details: { field: "timestamp" } },
    );
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    throw new AppError("VALIDATION_ERROR", "Invalid webhook signature.", {
      details: { field: "signature" },
    });
  }
}

export function signMockWebhookPayload(
  rawBody: string,
  secret: string,
  timestampSeconds: number,
): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${rawBody}`, "utf8")
    .digest("hex");
  return `t=${timestampSeconds},v1=${digest}`;
}
