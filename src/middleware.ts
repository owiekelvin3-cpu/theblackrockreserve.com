import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { isVerifiedCustomerToken } from "@/lib/customer-auth";
import { auditCookieHeader, COOKIE_CRITICAL_BYTES } from "@/lib/cookie-audit";
import { isApiRequestStatsEnabled, recordApiRequest } from "@/lib/api-request-stats";

/** Public API routes — skip JWT/cookie gate; each route applies its own limits. */
function isPublicApiPath(pathname: string): boolean {
  if (pathname === "/api/health" || pathname === "/api/ping") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/contact" || pathname === "/api/contact/settings") return true;
  if (pathname.startsWith("/api/currency/")) return true;
  if (pathname.startsWith("/api/diagnostics/")) return true;
  if (pathname === "/api/chat") return true;
  return false;
}

function dashboardDeniedResponse(
  request: NextRequest,
  token: { sub?: string; role?: string; emailVerified?: boolean } | null
) {
  if (request.nextUrl.pathname.startsWith("/api/dashboard")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token?.role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  loginUrl.searchParams.set("error", "sign_in_required");
  return NextResponse.redirect(loginUrl);
}

function authNotConfiguredResponse(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication is not configured" }, { status: 503 });
  }
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/login?error=auth_config", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=auth_config", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isApiRequestStatsEnabled() && pathname.startsWith("/api/")) {
    recordApiRequest(pathname, request.method);
  }

  if (isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie");
  auditCookieHeader(cookieHeader, pathname);

  if (cookieHeader && cookieHeader.length >= COOKIE_CRITICAL_BYTES) {
    const signOutUrl = new URL("/api/auth/clear-session", request.url);
    signOutUrl.searchParams.set("reason", "cookie_too_large");
    signOutUrl.searchParams.set("returnTo", pathname.startsWith("/admin") ? "/admin/login" : "/login");
    return NextResponse.redirect(signOutUrl);
  }

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    // Fail closed — never expose dashboard/admin without a working auth secret.
    return authNotConfiguredResponse(request);
  }

  const token = await getToken({ req: request, secret });

  if (pathname.startsWith("/api/admin")) {
    if (!token || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/dashboard")) {
    if (!isVerifiedCustomerToken(token)) {
      return dashboardDeniedResponse(request, token);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    if (!token || token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard")) {
    if (!isVerifiedCustomerToken(token)) {
      return dashboardDeniedResponse(request, token);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/api/:path*",
  ],
};
