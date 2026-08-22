import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isMockAdminSession,
} from "@/lib/admin/session";
import { isPublicPreview } from "@/lib/preview/public-preview";
import { isAdminOidcSessionCookie } from "@/src/server/admin/oidc/session";
import { createRequestId, REQUEST_ID_HEADER } from "@/src/server/http/request-context";

/**
 * Next.js 16 proxy (replaces deprecated middleware).
 * Protects Admin CMS routes. Accepts mock session (non-prod) or OIDC session cookie.
 * Customer auth is separate and not handled here.
 * API routes under /api/admin are guarded in handlers (session + CSRF), not here.
 * Public preview: admin UI is unavailable (not a mock-login surface).
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

  if (isPublicPreview()) {
    return withRequestId(new NextResponse(null, { status: 404 }));
  }

  const isLogin = pathname === "/admin/login";
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated =
    isMockAdminSession(session) || isAdminOidcSessionCookie(session);

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
