"use client";

import { useEffect } from "react";
import { isIosSafari, reportConnectivity } from "@/lib/connectivity-client";

const PING_TIMEOUT_MS = 12_000;

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        if (isIosSafari()) {
          const controller = new AbortController();
          const timeout = window.setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
          try {
            const ping = await fetch("/api/ping", {
              cache: "no-store",
              signal: controller.signal,
            });
            window.clearTimeout(timeout);
            if (!ping.ok) {
              reportConnectivity({
                phase: "sw_skip",
                ok: false,
                error: `ping_http_${ping.status}`,
                extra: { reason: "ios_safari_ping_failed" },
              });
              return;
            }
          } catch (err) {
            window.clearTimeout(timeout);
            reportConnectivity({
              phase: "sw_skip",
              ok: false,
              error: err instanceof Error ? err.name : "ping_failed",
              extra: { reason: "ios_safari_unreachable" },
            });
            return;
          }
        }

        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        reportConnectivity({ phase: "sw_register", ok: true });
      } catch (err) {
        reportConnectivity({
          phase: "sw_register",
          ok: false,
          error: err instanceof Error ? err.message : "register_failed",
        });
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }
  }, []);

  return null;
}
