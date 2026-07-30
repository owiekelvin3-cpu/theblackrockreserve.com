/**
 * In-process /api request counters. Enable with API_REQUEST_STATS=1.
 * Counts are incremented from middleware for paths matching /api/*.
 */

export type ApiRequestStatRow = {
  path: string;
  method: string;
  count: number;
  lastSeenAt: string;
};

type Bucket = { count: number; lastSeenAt: number };

const buckets = new Map<string, Bucket>();
let totalRequests = 0;
let startedAt = Date.now();

export function isApiRequestStatsEnabled() {
  return process.env.API_REQUEST_STATS === "1";
}

export function recordApiRequest(pathname: string, method: string) {
  if (!isApiRequestStatsEnabled()) return;

  const key = `${method} ${pathname}`;
  const existing = buckets.get(key);
  if (existing) {
    existing.count += 1;
    existing.lastSeenAt = Date.now();
  } else {
    buckets.set(key, { count: 1, lastSeenAt: Date.now() });
  }

  totalRequests += 1;

  if (totalRequests % 200 === 0) {
    console.info("[api-request-stats] top-5", JSON.stringify(getTopApiRequests(5)));
  }
}

export function getTopApiRequests(limit = 20): ApiRequestStatRow[] {
  return Array.from(buckets.entries())
    .map(([key, b]) => {
      const space = key.indexOf(" ");
      return {
        method: key.slice(0, space),
        path: key.slice(space + 1),
        count: b.count,
        lastSeenAt: new Date(b.lastSeenAt).toISOString(),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getApiRequestStatsSnapshot() {
  return {
    enabled: isApiRequestStatsEnabled(),
    startedAt: new Date(startedAt).toISOString(),
    uptimeMs: Date.now() - startedAt,
    totalRequests,
    uniqueRoutes: buckets.size,
    topRoutes: getTopApiRequests(20),
  };
}

export function resetApiRequestStats() {
  buckets.clear();
  totalRequests = 0;
  startedAt = Date.now();
}
