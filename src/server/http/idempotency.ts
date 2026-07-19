import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getDataSource } from "@/src/server/config/env";
import { prisma } from "@/src/server/database/prisma";

const memoryKeys = new Map<string, unknown>();

function hashKey(scope: string, key: string): string {
  return createHash("sha256").update(`${scope}:${key}`).digest("hex");
}

export function readIdempotencyKey(request: Request): string | null {
  const header =
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key");
  const trimmed = header?.trim();
  if (!trimmed) return null;
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  return trimmed;
}

export async function getIdempotentResponse<T>(
  scope: string,
  key: string,
): Promise<T | null> {
  const keyHash = hashKey(scope, key);
  if (getDataSource() !== "prisma") {
    return (memoryKeys.get(keyHash) as T | undefined) ?? null;
  }
  const row = await prisma.idempotencyKey.findUnique({
    where: { scope_keyHash: { scope, keyHash } },
  });
  if (!row) return null;
  return row.responseJson as T;
}

export async function saveIdempotentResponse<T>(
  scope: string,
  key: string,
  response: T,
): Promise<void> {
  const keyHash = hashKey(scope, key);
  if (getDataSource() !== "prisma") {
    memoryKeys.set(keyHash, response);
    return;
  }
  try {
    await prisma.idempotencyKey.create({
      data: {
        scope,
        keyHash,
        responseJson: response as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}
