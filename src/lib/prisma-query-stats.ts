/**
 * In-process Prisma query counters. Enable with PRISMA_QUERY_STATS=1.
 * Inspect via GET /api/admin/diagnostics/query-stats (admin session required).
 */

export type QueryStatRow = {
  key: string;
  count: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastSeenAt: string;
};

type Bucket = {
  count: number;
  totalDurationMs: number;
  lastSeenAt: number;
};

const buckets = new Map<string, Bucket>();
let totalQueries = 0;
let startedAt = Date.now();

/** Normalize SQL so similar queries group together (strip literals and ids). */
export function normalizeSqlQuery(sql: string): string {
  return sql
    .replace(/'(?:''|[^'])*'/g, "'?'")
    .replace(/\$\d+/g, "$?")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function isPrismaQueryStatsEnabled() {
  return process.env.PRISMA_QUERY_STATS === "1";
}

export function recordPrismaQuery(sql: string, durationMs: number) {
  if (!isPrismaQueryStatsEnabled()) return;

  const key = normalizeSqlQuery(sql);
  const existing = buckets.get(key);
  if (existing) {
    existing.count += 1;
    existing.totalDurationMs += durationMs;
    existing.lastSeenAt = Date.now();
  } else {
    buckets.set(key, { count: 1, totalDurationMs: durationMs, lastSeenAt: Date.now() });
  }

  totalQueries += 1;

  if (totalQueries % 100 === 0) {
    console.info("[prisma-query-stats] top-5", JSON.stringify(getTopQueries(5)));
  }
}

export function getTopQueries(limit = 20): QueryStatRow[] {
  return Array.from(buckets.entries())
    .map(([key, b]) => ({
      key,
      count: b.count,
      totalDurationMs: Math.round(b.totalDurationMs),
      avgDurationMs: Math.round(b.totalDurationMs / b.count),
      lastSeenAt: new Date(b.lastSeenAt).toISOString(),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function getPrismaQueryStatsSnapshot() {
  return {
    enabled: isPrismaQueryStatsEnabled(),
    startedAt: new Date(startedAt).toISOString(),
    uptimeMs: Date.now() - startedAt,
    totalQueries,
    uniquePatterns: buckets.size,
    topQueries: getTopQueries(20),
  };
}

export function resetPrismaQueryStats() {
  buckets.clear();
  totalQueries = 0;
  startedAt = Date.now();
}
