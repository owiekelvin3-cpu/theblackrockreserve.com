"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_MS = 60_000;

export type AdminFetchState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
  lastUpdated: Date | null;
};

export function useAdminFetch<T>(
  url: string | null,
  options?: { pollMs?: number; enabled?: boolean }
): AdminFetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pollMs = options?.pollMs ?? POLL_MS;
  const enabled = options?.enabled !== false && !!url;

  const load = useCallback(
    async (silent = false) => {
      if (!url) return;
      if (!silent) setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, { credentials: "include", cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof json.error === "string" ? json.error : `Failed to load (${res.status})`);
          if (!silent) setData(null);
          return;
        }
        setData(json as T);
        setLastUpdated(new Date());
      } catch {
        setError("Could not connect to the database API");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    load();
    const tick = () => {
      if (document.visibilityState === "visible") load(true);
    };
    const id = window.setInterval(tick, pollMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, load, pollMs]);

  return { data, error, loading, refresh: () => load(), lastUpdated };
}
