import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import type { PickupCredentials } from "@/src/server/models/pickup-verification";
import { env } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

const TOKEN_BYTES = 32;
/** Crockford Base32 alphabet — avoids ambiguous characters (0/O, 1/I/L). */
const PICKUP_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PICKUP_CODE_LENGTH = 8;
const REVEAL_PREFIX = "v1";

function resolveRevealKey(): Buffer {
  const material =
    env.pickupRevealSecret.trim() ||
    env.mockPaymentWebhookSecret.trim() ||
    (env.allowsMockProviders
      ? "dev-only-pickup-reveal-secret-not-for-production"
      : "");
  if (!material) {
    throw new AppError(
      "CONFIG_ERROR",
      "PICKUP_REVEAL_SECRET is required.",
    );
  }
  if (
    !env.allowsMockProviders &&
    material.includes("dev-only")
  ) {
    throw new AppError(
      "CONFIG_ERROR",
      "PICKUP_REVEAL_SECRET must not use a development placeholder.",
    );
  }
  return createHash("sha256").update(`pickup-reveal:${material}`).digest();
}

/** SHA-256 hex digest for token / pickup-code storage. */
export function hashPickupSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time compare of equal-length hex digests. */
export function safeEqualHash(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/** Cryptographically secure URL-safe token for QR payloads. */
export function generateQrToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Non-sequential short pickup code (Crockford Base32).
 * Not derived from order IDs.
 */
export function generatePickupCode(): string {
  const bytes = randomBytes(PICKUP_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < PICKUP_CODE_LENGTH; i += 1) {
    code += PICKUP_CODE_ALPHABET[bytes[i]! % PICKUP_CODE_ALPHABET.length];
  }
  return code;
}

export function generatePickupCredentials(): PickupCredentials {
  return {
    token: generateQrToken(),
    pickupCode: generatePickupCode(),
  };
}

/** Normalize manual pickup-code input (strip spaces/dashes, uppercase). */
export function normalizePickupCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * QR payload format — opaque credential, never an internal order UUID.
 * `LDTHPK1.<token>`
 */
export function buildQrPayload(token: string): string {
  return `LDTHPK1.${token}`;
}

/** Extract raw token from a scanned QR payload or bare token. */
export function extractTokenFromQrPayload(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("LDTHPK1.")) {
    return trimmed.slice("LDTHPK1.".length);
  }
  return trimmed;
}

export function encryptCustomerReveal(credentials: PickupCredentials): string {
  const key = resolveRevealKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(credentials);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    REVEAL_PREFIX,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptCustomerReveal(cipherText: string): PickupCredentials {
  const parts = cipherText.split(".");
  if (parts.length !== 4 || parts[0] !== REVEAL_PREFIX) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Pickup credential reveal payload is invalid.",
    );
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = resolveRevealKey();
  const iv = Buffer.from(ivB64!, "base64url");
  const tag = Buffer.from(tagB64!, "base64url");
  const data = Buffer.from(dataB64!, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(data),
    decipher.final(),
  ]).toString("utf8");
  const parsed = JSON.parse(plaintext) as PickupCredentials;
  if (
    typeof parsed.token !== "string" ||
    typeof parsed.pickupCode !== "string"
  ) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Pickup credential reveal payload is corrupt.",
    );
  }
  return parsed;
}
