import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  MOCK_ADMIN_SESSION_VALUE,
} from "@/lib/admin/session";
import { toErrorResponse } from "@/src/server/api/responses";
import { env } from "@/src/server/config/env";
import { assertCsrfOrigin } from "@/src/server/http/csrf";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import {
  createRequestId,
  REQUEST_ID_HEADER,
  runWithRequestContext,
} from "@/src/server/http/request-context";
import { AppError } from "@/src/server/utils/errors";

/**
 * Mock admin login — sets a development/staging session cookie.
 * Production Blocker: no password verification; refused in production.
 */
export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  return runWithRequestContext(requestId, async () => {
    try {
      if (env.isStrictProduction) {
        throw new AppError(
          "CONFIG_ERROR",
          "Mock admin authentication is a Production Blocker and cannot be used in production.",
        );
      }

      assertCsrfOrigin(request);
      await assertRateLimit({
        bucket: "admin-login",
        subject: clientSubjectFromRequest(request),
        maxAttempts: 20,
        windowMs: 60_000,
      });

      let nextPath = "/admin/dashboard";
      try {
        const body = (await request.json()) as { next?: unknown };
        if (typeof body.next === "string" && body.next.startsWith("/admin")) {
          nextPath = body.next;
        }
      } catch {
        // empty / non-JSON body is fine for mock login
      }

      const response = NextResponse.json({
        ok: true,
        data: { redirectTo: nextPath },
        requestId,
      });

      response.cookies.set({
        name: ADMIN_SESSION_COOKIE,
        value: MOCK_ADMIN_SESSION_VALUE,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: env.nodeEnv === "production",
      });
      response.headers.set(REQUEST_ID_HEADER, requestId);

      return response;
    } catch (error) {
      return toErrorResponse(error);
    }
  });
}
