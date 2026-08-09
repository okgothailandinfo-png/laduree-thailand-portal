import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { env } from "@/src/server/config/env";
import { createAdminAuthProvider } from "@/src/server/admin/oidc/provider";
import { toErrorResponse } from "@/src/server/api/responses";
import {
  createRequestId,
  REQUEST_ID_HEADER,
  runWithRequestContext,
} from "@/src/server/http/request-context";
import { AppError } from "@/src/server/utils/errors";

/**
 * Begin OIDC authorization-code flow for admin CMS.
 * Real IdP credentials are an external dependency — boundary is ready.
 */
export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  return runWithRequestContext(requestId, async () => {
    try {
      if (env.adminAuthProvider !== "oidc") {
        throw new AppError(
          "CONFIG_ERROR",
          "OIDC admin login requires ADMIN_AUTH_PROVIDER=oidc.",
        );
      }
      const provider = createAdminAuthProvider({
        name: "oidc",
        allowMock: false,
        oidc: {
          issuer: env.oidcIssuer ?? "",
          clientId: env.oidcClientId ?? "",
          clientSecret: env.oidcClientSecret ?? "",
          redirectUri: env.oidcRedirectUri ?? "",
          scopes: env.oidcScopes,
        },
      });
      const config = await provider.validateConfiguration();
      if (!config.ok || !provider.buildAuthorizationUrl) {
        throw new AppError(
          "PROVIDER_UNAVAILABLE",
          config.message ??
            "OIDC admin provider is not configured. Set OIDC_* credentials.",
          { status: 503 },
        );
      }
      const state = randomBytes(16).toString("hex");
      const url = provider.buildAuthorizationUrl(state);
      const response = NextResponse.redirect(url);
      response.cookies.set({
        name: "laduree_admin_oidc_state",
        value: state,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
        secure: env.nodeEnv === "production",
      });
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    } catch (error) {
      return toErrorResponse(error);
    }
  });
}
