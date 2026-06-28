import { NextRequest, NextResponse } from "next/server";
import { logConnectivity } from "@/lib/connectivity-log";

/** Minimal edge ping — no DB, no auth. Used to verify reachability before SW registration. */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const start = Date.now();
  logConnectivity("ping", request, { phase: "server_received", ok: true });

  const body = {
    ok: true as const,
    ts: new Date().toISOString(),
    serverMs: Date.now() - start,
    region: process.env.VERCEL_REGION ?? null,
    deployment: process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 12) ?? null,
  };

  const response = NextResponse.json(body);
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  response.headers.set("X-Connectivity-Ping", "1");
  response.headers.set("X-Response-Time-Ms", String(body.serverMs));
  return response;
}
