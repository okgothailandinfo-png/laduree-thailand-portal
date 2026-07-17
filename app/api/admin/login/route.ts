import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  MOCK_ADMIN_SESSION_VALUE,
} from "@/lib/admin/session";

/**
 * Mock admin login — sets a development session cookie.
 * No password verification; placeholder until a real auth provider exists.
 */
export async function POST(request: Request) {
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
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: MOCK_ADMIN_SESSION_VALUE,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
