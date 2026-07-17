import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin/session";

/** Clears the mock admin session cookie. */
export async function POST() {
  const response = NextResponse.json({
    ok: true,
    data: { redirectTo: "/admin/login" },
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
