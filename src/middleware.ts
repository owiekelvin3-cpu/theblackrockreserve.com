import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { isVerifiedCustomerToken } from "@/lib/customer-auth";
import { auditCookieHeader, COOKIE_CRITICAL_BYTES } from "@/lib/cookie-audit";

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
    "/api/dashboard",
    "/api/dashboard/:path*",
    "/api/admin",
    "/api/admin/:path*",
  ],
};
