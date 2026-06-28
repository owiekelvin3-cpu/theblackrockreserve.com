import { NextRequest, NextResponse } from "next/server";
import { auditCookieHeader } from "@/lib/cookie-audit";
import {
  NEXT_AUTH_COOKIE_NAMES,
  PREFERENCE_COOKIE_NAMES,
  secureCookieFlags,
  safeRedirectPath,
} from "@/lib/cookie-options";

/**
 * Clears NextAuth session cookies when the Cookie header is too large (494 prevention).
 * Users are redirected here automatically from middleware.
 */
export async function GET(request: NextRequest) {
  const rawReturn = request.nextUrl.searchParams.get("returnTo");
  const returnTo = safeRedirectPath(rawReturn, "/login");
  const reason = request.nextUrl.searchParams.get("reason") ?? "unknown";

  auditCookieHeader(request.headers.get("cookie"), `clear-session:${reason}`);

  const response = NextResponse.redirect(new URL(returnTo, request.url));
  const flags = secureCookieFlags();

  for (const name of NEXT_AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", { ...flags, maxAge: 0 });
  }

  if (reason === "cookie_too_large") {
    for (const name of PREFERENCE_COOKIE_NAMES) {
      response.cookies.set(name, "", { ...flags, maxAge: 0 });
    }
  }

  return response;
}
