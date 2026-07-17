import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  isMockAdminSession,
} from "@/lib/admin/session";

/**
 * Next.js 16 proxy (replaces deprecated middleware).
 * Protects Admin CMS routes with a mock session cookie only.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const isLogin = pathname === "/admin/login";
  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = isMockAdminSession(session);

  if (!authenticated && !isLogin) {
    const loginUrl = new URL("/admin/login", request.url);
    if (pathname !== "/admin") {
      loginUrl.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isLogin) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (pathname === "/admin") {
    return NextResponse.redirect(
      new URL(
        authenticated ? "/admin/dashboard" : "/admin/login",
        request.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
