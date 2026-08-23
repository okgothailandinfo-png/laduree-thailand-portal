/**
 * Stateless HMAC capability tokens for customer order access.
 * Prevents IDOR via guessable order UUIDs alone.
 *
 * Token format: base64url(payloadJson).base64url(hmacSha256)
 * Payload: { v:1, oid, exp, scopes[] }
 */

import { createHmac, timingSafeEqual } from "crypto";
import { readPreviewOrderAccessToken } from "@/src/server/preview/preview-commerce-cookie";
import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

export type OrderAccessScope =
  | "order"
  | "pickup"
  | "completion"
  | "history";

export type OrderAccessPayload = {
  v: 1;
  oid: string;
  exp: number;
  scopes: OrderAccessScope[];
};

/** Default TTL: 30 days (matches long-lived confirmation / history reopen). */
export const DEFAULT_ORDER_ACCESS_TTL_SECONDS = 30 * 24 * 60 * 60;

const CUSTOMER_SCOPES: OrderAccessScope[] = [
  "order",
  "pickup",
  "completion",
  "history",
];

function accessSecret(): string {
  const secret =
    process.env.ORDER_ACCESS_SECRET?.trim() ||
    env.pickupRevealSecret?.trim() ||
    env.mockPaymentWebhookSecret?.trim() ||
    "";
  if (!secret || secret.length < 16) {
    // Dev/test fallback — production/staging require real secrets via env load.
    if (env.appEnv === "development" || env.appEnv === "test") {
      return "dev-order-access-secret-not-for-production";
    }
    throw new AppError(
      "INTERNAL_ERROR",
      "Order access secret is not configured.",
      { status: 500 },
    );
  }
  return secret;
}

function toBase64Url(value: string | Buffer): string {
  const buf = typeof value === "string" ? Buffer.from(value, "utf8") : value;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function signPayload(encodedPayload: string, secret: string): string {
  return toBase64Url(
    createHmac("sha256", secret).update(encodedPayload, "utf8").digest(),
  );
}

export function issueOrderAccessToken(
  orderId: string,
  options?: {
    ttlSeconds?: number;
    scopes?: OrderAccessScope[];
    nowSeconds?: number;
  },
): string {
  const oid = orderId.trim();
  if (!oid) {
    throw new AppError("VALIDATION_ERROR", "orderId is required for access token.");
  }
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ttl = options?.ttlSeconds ?? DEFAULT_ORDER_ACCESS_TTL_SECONDS;
  const payload: OrderAccessPayload = {
    v: 1,
    oid,
    exp: now + ttl,
    scopes: options?.scopes ?? CUSTOMER_SCOPES,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, accessSecret());
  return `${encodedPayload}.${signature}`;
}

export function verifyOrderAccessToken(
  token: string,
  orderId: string,
  requiredScope: OrderAccessScope,
  options?: { nowSeconds?: number },
): OrderAccessPayload {
  const raw = token?.trim() ?? "";
  if (!raw || !raw.includes(".")) {
    throw new AppError("UNAUTHORIZED", "Order access token is required.", {
      status: 401,
    });
  }

  const [encodedPayload, signature, ...rest] = raw.split(".");
  if (!encodedPayload || !signature || rest.length > 0) {
    throw new AppError("UNAUTHORIZED", "Invalid order access token.", {
      status: 401,
    });
  }

  const expected = signPayload(encodedPayload, accessSecret());
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    throw new AppError("UNAUTHORIZED", "Invalid order access token.", {
      status: 401,
    });
  }

  let payload: OrderAccessPayload;
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as OrderAccessPayload;
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid order access token.", {
      status: 401,
    });
  }

  if (payload.v !== 1 || typeof payload.oid !== "string") {
    throw new AppError("UNAUTHORIZED", "Invalid order access token.", {
      status: 401,
    });
  }

  if (payload.oid !== orderId.trim()) {
    throw new AppError("FORBIDDEN", "Order access token does not match this order.", {
      status: 403,
    });
  }

  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp < now) {
    throw new AppError("UNAUTHORIZED", "Order access token has expired.", {
      status: 401,
    });
  }

  if (!Array.isArray(payload.scopes) || !payload.scopes.includes(requiredScope)) {
    throw new AppError("FORBIDDEN", "Order access token lacks required scope.", {
      status: 403,
    });
  }

  return payload;
}

/** Read token from `?token=` or `Authorization: Bearer …` / `X-Order-Access-Token`. */
export function extractOrderAccessToken(request: Request): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("token")?.trim();
  if (fromQuery) return fromQuery;

  const headerToken = request.headers.get("x-order-access-token")?.trim();
  if (headerToken) return headerToken;

  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    const bearer = auth.slice(7).trim();
    if (bearer) return bearer;
  }

  return null;
}

export async function resolveRequestAccessToken(
  request: Request,
  orderId?: string | null,
): Promise<string | null> {
  const fromRequest = extractOrderAccessToken(request);
  if (fromRequest) return fromRequest;
  return readPreviewOrderAccessToken(orderId);
}

export async function assertOrderAccess(
  request: Request,
  orderId: string,
  requiredScope: OrderAccessScope,
): Promise<void> {
  const token = await resolveRequestAccessToken(request, orderId);
  if (!token) {
    throw new AppError("UNAUTHORIZED", "Order access token is required.", {
      status: 401,
    });
  }
  verifyOrderAccessToken(token, orderId, requiredScope);
}
