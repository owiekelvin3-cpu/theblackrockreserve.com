"use client";

import { useCallback, useEffect, useState } from "react";
import { reportConnectivity } from "@/lib/connectivity-client";

type Step = {
  id: string;
  label: string;
  status: "pending" | "running" | "ok" | "fail";
  detail?: string;
  ms?: number;
};

const INITIAL_STEPS: Step[] = [
  { id: "html", label: "HTML document delivered", status: "ok" },
  { id: "ping", label: "GET /api/ping (edge, no database)", status: "pending" },
  { id: "health", label: "GET /api/health (full stack)", status: "pending" },
  { id: "document", label: "GET / (homepage HTML)", status: "pending" },
  { id: "sw", label: "Service worker state", status: "pending" },
];

async function timedFetch(url: string, init?: RequestInit) {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal, ...init });
    return { res, ms: Math.round(performance.now() - start) };
  } finally {
    window.clearTimeout(timeout);
  }
}

export default function ConnectivityCheckPage() {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);

  const updateStep = useCallback((id: string, patch: Partial<Step>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const runChecks = useCallback(async () => {
    setRunning(true);
    reportConnectivity({ phase: "connectivity_check", ok: true, extra: { action: "start" } });

    updateStep("ping", { status: "running" });
    try {
      const { res, ms } = await timedFetch("/api/ping");
      updateStep("ping", {
        status: res.ok ? "ok" : "fail",
        ms,
        detail: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}`,
      });
    } catch (e) {
      updateStep("ping", {
        status: "fail",
        detail: e instanceof Error ? e.name : "Network error",
      });
    }

    updateStep("health", { status: "running" });
    try {
      const { res, ms } = await timedFetch("/api/health");
      updateStep("health", {
        status: res.ok ? "ok" : "fail",
        ms,
        detail: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}`,
      });
    } catch (e) {
      updateStep("health", {
        status: "fail",
        detail: e instanceof Error ? e.name : "Network error",
      });
    }

    updateStep("document", { status: "running" });
    try {
      const { res, ms } = await timedFetch("/", { method: "GET", headers: { Accept: "text/html" } });
      updateStep("document", {
        status: res.ok ? "ok" : "fail",
        ms,
        detail: `${res.status} ${res.headers.get("content-type") ?? ""}`.trim(),
      });
    } catch (e) {
      updateStep("document", {
        status: "fail",
        detail: e instanceof Error ? e.name : "Network error",
      });
    }

    updateStep("sw", { status: "running" });
    try {
      if (!("serviceWorker" in navigator)) {
        updateStep("sw", { status: "ok", detail: "Not supported" });
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        updateStep("sw", {
          status: "ok",
          detail: reg
            ? `Active — ${reg.active?.scriptURL ?? "pending"}`
            : "No service worker registered",
        });
      }
    } catch (e) {
      updateStep("sw", {
        status: "fail",
        detail: e instanceof Error ? e.message : "SW check failed",
      });
    }

    reportConnectivity({ phase: "connectivity_check", ok: true, extra: { action: "complete" } });
    setRunning(false);
  }, [updateStep]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Connectivity check</h1>
      <p className="text-sm text-text-muted mb-6 leading-relaxed">
        If Safari shows &quot;couldn&apos;t connect to the server&quot;, this page helps determine
        whether HTML arrived and which request fails. Results are logged server-side for support.
      </p>
      <ul className="space-y-3 mb-6">
        {steps.map((step) => (
          <li
            key={step.id}
            className="rounded-xl border border-border bg-bg-secondary p-4 text-sm"
          >
            <div className="flex justify-between gap-2">
              <span>{step.label}</span>
              <span
                className={
                  step.status === "ok"
                    ? "text-accent-green"
                    : step.status === "fail"
                      ? "text-accent-red"
                      : step.status === "running"
                        ? "text-accent-gold"
                        : "text-text-muted"
                }
              >
                {step.status}
                {step.ms != null ? ` · ${step.ms}ms` : ""}
              </span>
            </div>
            {step.detail && <p className="text-text-muted mt-1 text-xs break-all">{step.detail}</p>}
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={running}
        onClick={() => void runChecks()}
        className="w-full py-3 rounded-xl brand-gradient-bg text-white font-semibold disabled:opacity-50"
      >
        {running ? "Running…" : "Run again"}
      </button>
      <p className="text-xs text-text-muted mt-4">
        URL: {typeof window !== "undefined" ? window.location.href : ""}
      </p>
    </main>
  );
}
