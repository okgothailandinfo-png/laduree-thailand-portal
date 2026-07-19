import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isMockAdminSession,
  MOCK_ADMIN_USER,
} from "@/lib/admin/session";
import { env, getDataSource } from "@/src/server/config/env";
import { assertCsrfOrigin } from "@/src/server/http/csrf";
import { AppError } from "@/src/server/utils/errors";

/**
 * Mock admin session guard — NON-PRODUCTION placeholder.
 * Production Blocker: replace with a real identity provider before go-live.
 */
export async function requireAdminSession(): Promise<void> {
  if (env.isStrictProduction) {
    throw new AppError(
      "CONFIG_ERROR",
      "Mock admin authentication is a Production Blocker and cannot be used in production.",
    );
  }
  const jar = await cookies();
  const value = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isMockAdminSession(value)) {
    throw new AppError(
      "UNAUTHORIZED",
      "Admin session required. Mock authorization is non-production.",
    );
  }
}

/** Cookie-authenticated admin writes: session + Origin/Referer CSRF check. */
export async function requireAdminWrite(request: Request): Promise<{
  actorId: string;
}> {
  assertCsrfOrigin(request);
  await requireAdminSession();
  return { actorId: MOCK_ADMIN_USER.id };
}

/**
 * Admin writes require Prisma-backed repositories.
 * Never silently fall back to mock data.
 */
export function requirePrismaDataSource(): void {
  const source = getDataSource();
  if (source !== "prisma") {
    throw new AppError(
      "CONFIG_ERROR",
      'Admin write operations require DATA_SOURCE=prisma and a configured DATABASE_URL.',
      {
        details: { dataSource: source },
      },
    );
  }
  if (!process.env.DATABASE_URL?.trim()) {
    throw new AppError(
      "CONFIG_ERROR",
      "DATABASE_URL is required for admin operations.",
    );
  }
}
