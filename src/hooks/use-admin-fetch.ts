"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_MS = 90_000;
const DEDUP_MS = 8_000;

type CacheEntry = { data: unknown; at: number };
const responseCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

async function fetchAdminJson<T>(url: string): Promise<T> {
  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.at < DEDUP_MS) {
    return cached.data as T;
  }

  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : `Failed to load (${res.status})`);
        responseCache.set(url, { data: json, at: Date.now() });
        return json;
      })
      .finally(() => {
        inflight.delete(url);
      });
    inflight.set(url, pending);
  }

  return (await pending) as T;
}

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
        const json = await fetchAdminJson<T>(url);
        setData(json);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not connect to the database API");
        if (!silent) setData(null);
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

  return {
    data,
    error,
    loading,
    refresh: () => {
      if (url) responseCache.delete(url);
      load();
    },
    lastUpdated,
  };
}

export function clearAdminFetchCache(url?: string) {
  if (url) responseCache.delete(url);
  else responseCache.clear();
}

export function clearAdminFetchCacheByPrefix(prefix: string) {
  Array.from(responseCache.keys()).forEach((key) => {
    if (key.startsWith(prefix)) responseCache.delete(key);
  });
  Array.from(inflight.keys()).forEach((key) => {
    if (key.startsWith(prefix)) inflight.delete(key);
  });
}
