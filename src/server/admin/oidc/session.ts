/**
 * Signed admin session cookie payload (post-OIDC callback).
 * Server-only HMAC — never put client secrets in the browser bundle.
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { AdminPrincipal } from "@/src/server/admin/oidc/types";
import { AppError } from "@/src/server/utils/errors";

const SESSION_PREFIX = "oidc1.";

export type AdminOidcSessionPayload = {
  v: 1;
  id: string;
  email: string;
  name: string;
  sub: string;
  exp: number;
};

function sessionSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.PICKUP_REVEAL_SECRET?.trim() ||
    "";
  if (!secret || secret.length < 16) {
    const appEnv = process.env.APP_ENV?.trim().toLowerCase();
    const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
    const allowDevFallback =
      appEnv !== "production" &&
      (appEnv === "development" ||
        appEnv === "test" ||
        appEnv === "staging" ||
        !appEnv ||
        nodeEnv === "development" ||
        nodeEnv === "test" ||
        !nodeEnv);
    if (allowDevFallback) {
      return "dev-admin-session-secret-not-for-production";
    }
    throw new AppError(
      "CONFIG_ERROR",
      "ADMIN_SESSION_SECRET is required for OIDC admin sessions.",
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

export function issueAdminOidcSession(
  principal: AdminPrincipal & { subject: string },
  ttlSeconds = 60 * 60 * 8,
): string {
  const payload: AdminOidcSessionPayload = {
    v: 1,
    id: principal.id,
    email: principal.email,
    name: principal.name,
    sub: principal.subject,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const sig = toBase64Url(
    createHmac("sha256", sessionSecret()).update(encoded, "utf8").digest(),
  );
  return `${SESSION_PREFIX}${encoded}.${sig}`;
}

export function verifyAdminOidcSession(
  value: string | undefined | null,
): AdminPrincipal {
  const raw = value?.trim() ?? "";
  if (!raw.startsWith(SESSION_PREFIX)) {
    throw new AppError("UNAUTHORIZED", "Admin OIDC session required.", {
      status: 401,
    });
  }
  const body = raw.slice(SESSION_PREFIX.length);
  const [encoded, signature, ...rest] = body.split(".");
  if (!encoded || !signature || rest.length > 0) {
    throw new AppError("UNAUTHORIZED", "Invalid admin session.", {
      status: 401,
    });
  }
  const expected = toBase64Url(
    createHmac("sha256", sessionSecret()).update(encoded, "utf8").digest(),
  );
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    throw new AppError("UNAUTHORIZED", "Invalid admin session.", {
      status: 401,
    });
  }
  let payload: AdminOidcSessionPayload;
  try {
    payload = JSON.parse(
      fromBase64Url(encoded).toString("utf8"),
    ) as AdminOidcSessionPayload;
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid admin session.", {
      status: 401,
    });
  }
  if (payload.v !== 1 || !payload.id || !payload.email) {
    throw new AppError("UNAUTHORIZED", "Invalid admin session.", {
      status: 401,
    });
  }
  if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError("UNAUTHORIZED", "Admin session has expired.", {
      status: 401,
    });
  }
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name || payload.email,
    subject: payload.sub,
  };
}

export function isAdminOidcSessionCookie(
  value: string | undefined | null,
): boolean {
  return Boolean(value?.trim().startsWith(SESSION_PREFIX));
}
