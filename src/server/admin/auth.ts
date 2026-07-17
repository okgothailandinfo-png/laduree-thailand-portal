import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isMockAdminSession,
} from "@/lib/admin/session";
import { getDataSource } from "@/src/server/config/env";
import { AppError } from "@/src/server/utils/errors";

/**
 * Mock admin session guard — NON-PRODUCTION placeholder.
 * Does not implement a real authentication provider.
 */
export async function requireAdminSession(): Promise<void> {
  const jar = await cookies();
  const value = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isMockAdminSession(value)) {
    throw new AppError(
      "UNAUTHORIZED",
      "Admin session required. Mock authorization is non-production.",
    );
  }
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
      "DATABASE_URL is required for admin catalog operations.",
    );
  }
}
