"use client";

import { useEffect } from "react";
import { reportConnectivity } from "@/lib/connectivity-client";

/** Reports post-load connectivity phases to server logs (Vercel runtime). */
export default function ConnectivityProbe() {
  useEffect(() => {
    reportConnectivity({ phase: "react_hydrated", ok: true });

    const started = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    fetch("/api/ping", { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        window.clearTimeout(timeout);
        const durationMs = Math.round(performance.now() - started);
        if (!res.ok) {
          reportConnectivity({
            phase: "ping_client_fail",
            ok: false,
            durationMs,
            error: `HTTP ${res.status}`,
          });
          return;
        }
        const data = await res.json().catch(() => ({}));
        reportConnectivity({
          phase: "ping_client",
          ok: true,
          durationMs,
          extra: { serverRegion: data.region ?? null, serverMs: data.serverMs ?? null },
        });
      })
      .catch((err: unknown) => {
        window.clearTimeout(timeout);
        reportConnectivity({
          phase: "ping_client_fail",
          ok: false,
          durationMs: Math.round(performance.now() - started),
          error: err instanceof Error ? err.name : "fetch_failed",
        });
      });
  }, []);

  return null;
}
