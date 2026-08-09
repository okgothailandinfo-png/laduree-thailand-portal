import { NextResponse } from "next/server";
import { env } from "@/src/server/config/env";
import { issueAdminOidcSession } from "@/src/server/admin/oidc/session";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/session";
import { toErrorResponse } from "@/src/server/api/responses";
import {
  createRequestId,
  REQUEST_ID_HEADER,
  runWithRequestContext,
} from "@/src/server/http/request-context";
import { AppError } from "@/src/server/utils/errors";
import { logger } from "@/src/server/utils/logger";

/**
 * OIDC callback boundary.
 * Exchanges authorization code via standard token endpoint when IdP is configured.
 * Does not invent proprietary IdP behavior.
 */
export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  return runWithRequestContext(requestId, async () => {
    try {
      if (env.adminAuthProvider !== "oidc") {
        throw new AppError(
          "CONFIG_ERROR",
          "OIDC callback requires ADMIN_AUTH_PROVIDER=oidc.",
        );
      }
      if (
        !env.oidcIssuer ||
        !env.oidcClientId ||
        !env.oidcClientSecret ||
        !env.oidcRedirectUri
      ) {
        throw new AppError(
          "PROVIDER_UNAVAILABLE",
          "OIDC admin credentials are not configured.",
          { status: 503 },
        );
      }

      const url = new URL(request.url);
      const code = url.searchParams.get("code")?.trim();
      const state = url.searchParams.get("state")?.trim();
      if (!code || !state) {
        throw new AppError(
          "BAD_REQUEST",
          "OIDC callback missing code or state.",
        );
      }

      const cookieHeader = request.headers.get("cookie") ?? "";
      const stateCookie = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("laduree_admin_oidc_state="))
        ?.slice("laduree_admin_oidc_state=".length);
      if (!stateCookie || stateCookie !== state) {
        throw new AppError("UNAUTHORIZED", "Invalid OIDC state.", {
          status: 401,
        });
      }

      const issuer = env.oidcIssuer.replace(/\/$/, "");
      const tokenUrl = `${issuer}/token`;
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.oidcRedirectUri,
        client_id: env.oidcClientId,
        client_secret: env.oidcClientSecret,
      });

      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
      });

      if (!tokenResponse.ok) {
        logger.error("OIDC token exchange failed", {
          status: tokenResponse.status,
        });
        throw new AppError(
          "PROVIDER_UNAVAILABLE",
          "OIDC token exchange failed. Verify issuer and client credentials.",
          { status: 503 },
        );
      }

      const tokenJson = (await tokenResponse.json()) as {
        access_token?: string;
        id_token?: string;
      };

      // Minimal userinfo fetch — standard OIDC; claims mapped without inventing fields.
      const userinfoResponse = await fetch(`${issuer}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token ?? ""}`,
          Accept: "application/json",
        },
      });
      if (!userinfoResponse.ok) {
        throw new AppError(
          "PROVIDER_UNAVAILABLE",
          "OIDC userinfo request failed.",
          { status: 503 },
        );
      }
      const profile = (await userinfoResponse.json()) as {
        sub?: string;
        email?: string;
        name?: string;
      };
      if (!profile.sub || !profile.email) {
        throw new AppError(
          "UNAUTHORIZED",
          "OIDC profile missing required subject/email claims.",
          { status: 401 },
        );
      }

      const session = issueAdminOidcSession({
        id: `oidc:${profile.sub}`,
        email: profile.email,
        name: profile.name || profile.email,
        subject: profile.sub,
      });

      const response = NextResponse.redirect(
        new URL("/admin/dashboard", env.appBaseUrl),
      );
      response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: session,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.nodeEnv === "production",
      });
      response.cookies.set({
        name: "laduree_admin_oidc_state",
        value: "",
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      response.headers.set(REQUEST_ID_HEADER, requestId);
      return response;
    } catch (error) {
      return toErrorResponse(error);
    }
  });
}
