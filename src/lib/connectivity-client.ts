/** Client-side connectivity reporting — safe to import from "use client" components. */

export type ClientConnectivityPhase =
  | "html_parsed"
  | "react_hydrated"
  | "ping_client"
  | "ping_client_fail"
  | "connectivity_check"
  | "sw_register"
  | "sw_skip";

export type ClientConnectivityReport = {
  phase: ClientConnectivityPhase | string;
  ok?: boolean;
  durationMs?: number;
  error?: string;
  clientTs?: number;
  url?: string;
  extra?: Record<string, unknown>;
};

function connectionMeta() {
  if (typeof navigator === "undefined") return {};
  const nav = navigator as Navigator & {
    standalone?: boolean;
    connection?: { effectiveType?: string };
  };
  return {
    ua: navigator.userAgent,
    standalone: Boolean(nav.standalone),
    hasServiceWorker: "serviceWorker" in navigator,
    effectiveType: nav.connection?.effectiveType ?? null,
    visibility: typeof document !== "undefined" ? document.visibilityState : null,
  };
}

export function reportConnectivity(report: ClientConnectivityReport) {
  if (typeof window === "undefined") return;

  const payload = {
    ...report,
    clientTs: report.clientTs ?? Date.now(),
    url: report.url ?? window.location.href,
    ...connectionMeta(),
  };

  const json = JSON.stringify(payload);

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/diagnostics/report",
        new Blob([json], { type: "application/json" })
      );
      if (sent) return;
    }
  } catch {
    /* fall through to fetch */
  }

  void fetch("/api/diagnostics/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    /* non-fatal */
  });
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua);
  const webkit = /Safari/i.test(ua);
  const other = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return ios && webkit && !other;
}
