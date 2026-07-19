import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isMockAdminSession,
} from "@/lib/admin/session";
import { createRequestId, REQUEST_ID_HEADER } from "@/src/server/http/request-context";

/**
 * Next.js 16 proxy (replaces deprecated middleware).
 * Protects Admin CMS routes with a mock session cookie only.
 *
 * Production Blocker: mock admin authentication must be replaced before go-live.
 * API routes under /api/admin are guarded in handlers (session + CSRF), not here.
 */
export function proxy(request: NextRequest) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  const { pathname } = request.nextUrl;

  const withRequestId = (response: NextResponse) => {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  };

  if (!pathname.startsWith("/admin")) {
    return withRequestId(NextResponse.next());
  }

  const isLogin = pathname === "/admin/login";
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = isMockAdminSession(session);

  if (!authenticated && !isLogin) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", pathname);
    }
    return withRequestId(NextResponse.redirect(loginUrl));
  }

  if (authenticated && isLogin) {
    return withRequestId(
      NextResponse.redirect(new URL("/admin/dashboard", request.url)),
    );
  }

  if (pathname === "/admin") {
    return withRequestId(
      NextResponse.redirect(
        new URL(
          authenticated ? "/admin/dashboard" : "/admin/login",
          request.url,
        ),
      ),
    );
  }

  return withRequestId(NextResponse.next());
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
