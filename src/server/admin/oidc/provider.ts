/**
 * OIDC admin auth provider boundary.
 * Uses standard OIDC authorization-code redirect; does not invent IdP APIs.
 * Real issuer/client credentials are an external dependency (P1 configuration).
 */

import {
  isMockAdminSession,
  MOCK_ADMIN_USER,
} from "@/lib/admin/session";
import {
  verifyAdminOidcSession,
} from "@/src/server/admin/oidc/session";
import type {
  AdminAuthProvider,
  AdminOidcConfig,
  AdminPrincipal,
} from "@/src/server/admin/oidc/types";
import { AppError } from "@/src/server/utils/errors";

export class MockAdminAuthProvider implements AdminAuthProvider {
  readonly name = "mock" as const;

  async validateConfiguration(): Promise<{ ok: boolean; message?: string }> {
    return {
      ok: true,
      message: "Mock admin auth is development/staging only.",
    };
  }

  async requirePrincipal(
    sessionValue: string | undefined | null,
  ): Promise<AdminPrincipal> {
    if (!isMockAdminSession(sessionValue)) {
      throw new AppError(
        "UNAUTHORIZED",
        "Admin session required. Mock authorization is non-production.",
      );
    }
    return {
      id: MOCK_ADMIN_USER.id,
      email: MOCK_ADMIN_USER.email,
      name: MOCK_ADMIN_USER.name,
    };
  }
}

export class OidcAdminAuthProvider implements AdminAuthProvider {
  readonly name = "oidc" as const;

  constructor(private readonly config: AdminOidcConfig) {}

  async validateConfiguration(): Promise<{ ok: boolean; message?: string }> {
    if (
      !this.config.issuer ||
      !this.config.clientId ||
      !this.config.clientSecret ||
      !this.config.redirectUri
    ) {
      return {
        ok: false,
        message:
          "OIDC admin auth requires OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI.",
      };
    }
    if (!/^https:\/\//i.test(this.config.issuer)) {
      return {
        ok: false,
        message: "OIDC_ISSUER must be an https URL.",
      };
    }
    return { ok: true };
  }

  async requirePrincipal(
    sessionValue: string | undefined | null,
  ): Promise<AdminPrincipal> {
    return verifyAdminOidcSession(sessionValue);
  }

  buildAuthorizationUrl(state: string): string {
    const authEndpoint = `${this.config.issuer.replace(/\/$/, "")}/authorize`;
    const url = new URL(authEndpoint);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", this.config.scopes || "openid email profile");
    url.searchParams.set("state", state);
    return url.toString();
  }
}

export function createAdminAuthProvider(options: {
  name: "mock" | "oidc";
  oidc?: AdminOidcConfig | null;
  allowMock: boolean;
}): AdminAuthProvider {
  if (options.name === "mock") {
    if (!options.allowMock) {
      throw new AppError(
        "CONFIG_ERROR",
        "Mock admin authentication cannot be used in production. Set ADMIN_AUTH_PROVIDER=oidc.",
      );
    }
    return new MockAdminAuthProvider();
  }

  if (!options.oidc) {
    throw new AppError(
      "CONFIG_ERROR",
      "ADMIN_AUTH_PROVIDER=oidc requires OIDC_* environment variables.",
    );
  }
  return new OidcAdminAuthProvider(options.oidc);
}
