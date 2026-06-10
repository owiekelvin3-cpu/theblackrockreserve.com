import { NextRequest, NextResponse } from "next/server";
import { auditCookieHeader } from "@/lib/cookie-audit";

/**
 * Clears NextAuth session cookies when the Cookie header is too large (494 prevention).
 * Users are redirected here automatically from middleware.
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/login";
  const reason = request.nextUrl.searchParams.get("reason") ?? "unknown";

  auditCookieHeader(request.headers.get("cookie"), `clear-session:${reason}`);

  const response = NextResponse.redirect(new URL(returnTo, request.url));

  const cookieNames = [
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.callback-url",
    "next-auth.callback-url",
    "__Host-next-auth.csrf-token",
    "next-auth.csrf-token",
  ];

  for (const name of cookieNames) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
