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
  if (!token?.sub) {
    loginUrl.searchParams.set("error", "sign_in_required");
  } else {
    loginUrl.searchParams.set("error", "verify_email");
  }
  return NextResponse.redirect(loginUrl);
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

  if (!process.env.NEXTAUTH_SECRET?.trim()) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

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
  ],
};
