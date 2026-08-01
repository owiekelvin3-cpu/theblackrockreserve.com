import { NextRequest, NextResponse } from "next/server";
import { logConnectivity } from "@/lib/connectivity-log";

export const dynamic = "force-dynamic";

type ClientReport = {
  phase?: string;
  ok?: boolean;
  durationMs?: number;
  error?: string;
  clientTs?: number;
  url?: string;
  ua?: string;
  standalone?: boolean;
  hasServiceWorker?: boolean;
  effectiveType?: string | null;
  visibility?: string;
  extra?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  let body: ClientReport = {};
  try {
    const raw = await request.text();
    if (raw.length > 8192) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    body = raw ? (JSON.parse(raw) as ClientReport) : {};
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const phase = typeof body.phase === "string" ? body.phase : "unknown";

  logConnectivity("connectivity_check", request, {
    phase,
    ok: body.ok,
    durationMs: body.durationMs,
    error: body.error,
    clientTs: body.clientTs,
    url: body.url,
    extra: {
      standalone: body.standalone,
      hasServiceWorker: body.hasServiceWorker,
      effectiveType: body.effectiveType,
      visibility: body.visibility,
      clientUa: body.ua,
      ...body.extra,
    },
  });

  const response = NextResponse.json({ received: true, phase, ts: new Date().toISOString() });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
