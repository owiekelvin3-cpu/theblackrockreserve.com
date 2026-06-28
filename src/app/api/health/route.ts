import { NextRequest, NextResponse } from "next/server";
import { isNextAuthConfigured } from "@/lib/auth-config";
import { isEmailConfigured, getEmailProvider } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { logConnectivity } from "@/lib/connectivity-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = Date.now();
  let databaseOk = false;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseOk = true;
  } catch (err) {
    databaseOk = false;
    dbError = err instanceof Error ? err.message.slice(0, 120) : "db_error";
  }

  const durationMs = Date.now() - start;
  const authOk = isNextAuthConfigured();
  const emailOk = isEmailConfigured();

  logConnectivity("health", request, {
    phase: "health_complete",
    ok: authOk && databaseOk,
    durationMs,
    error: dbError ?? undefined,
    extra: { databaseOk, authOk },
  });

  return NextResponse.json({
    ok: authOk && databaseOk,
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
