import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, MOCK_ADMIN_USER } from "@/lib/admin/session";
import { createAdminAuthProvider } from "@/src/server/admin/oidc/provider";
import type { AdminPrincipal } from "@/src/server/admin/oidc/types";
import { env, getDataSource } from "@/src/server/config/env";
import { assertCsrfOrigin } from "@/src/server/http/csrf";
import { AppError } from "@/src/server/utils/errors";

function adminAuth() {
  return createAdminAuthProvider({
    name: env.adminAuthProvider,
    allowMock: env.allowsMockProviders,
    oidc:
      env.adminAuthProvider === "oidc"
        ? {
            issuer: env.oidcIssuer ?? "",
            clientId: env.oidcClientId ?? "",
            clientSecret: env.oidcClientSecret ?? "",
            redirectUri: env.oidcRedirectUri ?? "",
            scopes: env.oidcScopes,
          }
        : null,
  });
}

/**
 * Admin session guard — mock in non-production; OIDC session in production.
 * Customer authentication is intentionally separate (guest / future LINE).
 */
export async function requireAdminSession(): Promise<AdminPrincipal> {
  if (env.adminAuthProvider === "mock" && env.isStrictProduction) {
    throw new AppError(
      "CONFIG_ERROR",
      "Mock admin authentication is a Production Blocker and cannot be used in production.",
    );
  }
  const jar = await cookies();
  const value = jar.get(ADMIN_SESSION_COOKIE)?.value;
  return adminAuth().requirePrincipal(value);
}

/** Cookie-authenticated admin writes: session + Origin/Referer CSRF check. */
export async function requireAdminWrite(request: Request): Promise<{
  actorId: string;
}> {
  assertCsrfOrigin(request);
  const principal = await requireAdminSession();
  return { actorId: principal.id || MOCK_ADMIN_USER.id };
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
