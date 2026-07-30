import { NextRequest, NextResponse } from "next/server";
import { isNextAuthConfigured } from "@/lib/auth-config";
import { isEmailConfigured, getEmailProvider } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { logConnectivity } from "@/lib/connectivity-log";
import { getCachedDbHealth, setCachedDbHealth } from "@/lib/health-db-cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request) ?? "anonymous";
  const limited = checkRateLimit(`health:${ip}`, 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "Too many health checks" }, { status: 429 });
  }

  const start = Date.now();
  let databaseOk = false;
  let dbError: string | null = null;
  let dbFromCache = false;

  const cached = getCachedDbHealth();
  if (cached) {
    databaseOk = cached.ok;
    dbError = cached.error;
    dbFromCache = true;
  } else {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
      setCachedDbHealth(true, null);
    } catch (err) {
      databaseOk = false;
      dbError = err instanceof Error ? err.message.slice(0, 120) : "db_error";
      setCachedDbHealth(false, dbError);
    }
  }

  const durationMs = Date.now() - start;
  const authOk = isNextAuthConfigured();
  const emailOk = isEmailConfigured();
  const ok = authOk && databaseOk;

  logConnectivity("health", request, {
    phase: "health_complete",
    ok,
    durationMs,
    error: dbError ?? undefined,
    extra: { databaseOk, authOk, dbFromCache },
  });

  // Production: only expose status booleans (no secrets, URLs, or provider details).
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({
      ok,
      serverMs: durationMs,
      auth: { configured: authOk },
      database: { connected: databaseOk },
      email: { configured: emailOk },
    });
  }

  return NextResponse.json({
    ok,
    serverMs: durationMs,
    auth: {
      configured: authOk,
      hasSecret: Boolean(process.env.NEXTAUTH_SECRET?.trim()),
      secretLength: process.env.NEXTAUTH_SECRET?.trim().length ?? 0,
      nextAuthUrl: process.env.NEXTAUTH_URL ?? null,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    },
    database: {
      connected: databaseOk,
    },
    email: {
      configured: emailOk,
      provider: getEmailProvider(),
    },
    admin: {
      emailConfigured: Boolean(process.env.ADMIN_EMAIL?.trim()),
      passwordless: process.env.ADMIN_PASSWORDLESS === "true",
    },
    region: process.env.VERCEL_REGION ?? null,
  });
}
