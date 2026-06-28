import type { NextRequest } from "next/server";

export type ConnectivityPhase =
  | "ping"
  | "health"
  | "html_parsed"
  | "react_hydrated"
  | "ping_client"
  | "ping_client_fail"
  | "connectivity_check"
  | "sw_register"
  | "sw_skip"
  | "middleware";

export type ConnectivityLogPayload = {
  phase: ConnectivityPhase | string;
  ok?: boolean;
  durationMs?: number;
  error?: string;
  clientTs?: number;
  url?: string;
  extra?: Record<string, unknown>;
};

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

/** Structured logs appear in Vercel → Deployments → Runtime Logs */
export function logConnectivity(
  kind: ConnectivityPhase | string,
  request: NextRequest,
  payload: ConnectivityLogPayload = { phase: kind }
) {
  const entry = {
    tag: "connectivity",
    kind,
    phase: payload.phase,
    ok: payload.ok,
    durationMs: payload.durationMs,
    error: payload.error,
    clientTs: payload.clientTs,
    url: payload.url,
    path: request.nextUrl.pathname,
    method: request.method,
    ip: clientIp(request),
    country: request.headers.get("x-vercel-ip-country"),
    region: process.env.VERCEL_REGION ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID?.slice(0, 12) ?? null,
    ua: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    vercelId: request.headers.get("x-vercel-id"),
    extra: payload.extra,
    serverTs: new Date().toISOString(),
  };

  if (payload.ok === false || payload.error) {
    console.error("[connectivity]", JSON.stringify(entry));
  } else {
    console.info("[connectivity]", JSON.stringify(entry));
  }

  return entry;
}
