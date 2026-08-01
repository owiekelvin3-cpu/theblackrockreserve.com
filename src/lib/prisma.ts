import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  transactionPrisma: PrismaClient | undefined;
};

function appendParam(url: string, param: string) {
  return `${url}${url.includes("?") ? "&" : "?"}${param}`;
}

function isServerlessRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** Vercel/Lambda: one connection per instance — higher limits exhaust Supabase pooler. */
function getPoolConnectionLimit() {
  return isServerlessRuntime() ? 1 : 5;
}

function enforceConnectionLimit(url: string, limit: number) {
  try {
    const normalized = url.replace(/^postgresql:/i, "postgres:");
    const parsed = new URL(normalized);
    parsed.searchParams.set("connection_limit", String(limit));
    return parsed.toString().replace(/^postgres:/i, "postgresql:");
  } catch {
    if (url.includes("connection_limit=")) {
      return url.replace(/connection_limit=\d+/i, `connection_limit=${limit}`);
    }
    return appendParam(url, `connection_limit=${limit}`);
  }
}

function isPoolerUrl(url: string) {
  return url.includes("pgbouncer") || url.includes(":6543") || url.includes("pooler.supabase.com");
}

/** Transaction pooler (6543 / pgbouncer=true) cannot run interactive Prisma transactions. */
function isTransactionPoolerUrl(url: string) {
  return url.includes(":6543") || url.includes("pgbouncer=true");
}

function isUsableForInteractiveTransactions(url: string) {
  return Boolean(url) && !isTransactionPoolerUrl(url);
}

function stripTransactionPoolerParams(url: string) {
  try {
    const normalized = url.replace(/^postgresql:/i, "postgres:");
    const parsed = new URL(normalized);
    if (parsed.port === "6543") parsed.port = "5432";
    parsed.searchParams.delete("pgbouncer");
    if (!parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }
    return parsed.toString().replace(/^postgres:/i, "postgresql:");
  } catch {
    return url;
  }
}

/** Supabase session pooler (port 5432) supports interactive transactions. */
function deriveSessionPoolerUrl(databaseUrl: string): string | null {
  try {
    const normalized = databaseUrl.replace(/^postgresql:/i, "postgres:");
    const url = new URL(normalized);
    if (!url.hostname.includes("pooler.supabase.com")) return null;
    url.port = "5432";
    url.searchParams.delete("pgbouncer");
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }
    return url.toString().replace(/^postgres:/i, "postgresql:");
  } catch {
    return null;
  }
}

function withPoolSettings(url: string | undefined) {
  if (!url) return url;
  let result = url;
  if (!result.includes("connect_timeout")) {
    result = appendParam(result, "connect_timeout=10");
  }
  if (!result.includes("pool_timeout")) {
    result = appendParam(result, "pool_timeout=30");
  }
  if (isPoolerUrl(result)) {
    if (!result.includes("pgbouncer=") && result.includes(":6543")) {
      result = appendParam(result, "pgbouncer=true");
    }
    result = enforceConnectionLimit(result, getPoolConnectionLimit());
  }
  return result;
}

function withDirectConnectionSettings(url: string) {
  let result = url;
  if (!result.includes("connect_timeout")) {
    result = appendParam(result, "connect_timeout=10");
  }
  if (isServerlessRuntime()) {
    result = enforceConnectionLimit(result, 1);
  }
  return result;
}

/** Derive Supabase direct host (5432) from a pooler URL when DIRECT_URL is missing or wrong. */
function deriveSupabaseDirectUrl(poolerUrl: string): string | null {
  try {
    const normalized = poolerUrl.replace(/^postgresql:/i, "postgres:");
    const url = new URL(normalized);

    if (!isPoolerUrl(poolerUrl)) return null;

    const user = decodeURIComponent(url.username);
    let projectRef: string | null = null;
    if (user.startsWith("postgres.") && user.length > "postgres.".length) {
      projectRef = user.slice("postgres.".length);
    }
    if (!projectRef) return null;

    url.hostname = `db.${projectRef}.supabase.co`;
    url.port = "5432";
    url.searchParams.delete("pgbouncer");
    if (!url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    return url.toString().replace(/^postgres:/i, "postgresql:");
  } catch {
    return null;
  }
}

function resolveDirectDatabaseUrl(): string {
  const direct = process.env.DIRECT_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (direct && isUsableForInteractiveTransactions(direct)) {
    return withDirectConnectionSettings(stripTransactionPoolerParams(direct));
  }

  const sessionPooler = databaseUrl ? deriveSessionPoolerUrl(databaseUrl) : null;
  if (sessionPooler) {
    if (process.env.NODE_ENV === "development" && direct && isTransactionPoolerUrl(direct)) {
      console.warn(
        "[prisma] DIRECT_URL uses the transaction pooler (6543) — using Supabase session pooler on 5432 for interactive transactions."
      );
    }
    return withDirectConnectionSettings(sessionPooler);
  }

  const derived = databaseUrl ? deriveSupabaseDirectUrl(databaseUrl) : null;
  if (derived) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[prisma] Using derived db.[PROJECT_REF].supabase.co connection for interactive transactions."
      );
    }
    return withDirectConnectionSettings(derived);
  }

  if (direct) {
    console.warn(
      "[prisma] DIRECT_URL may not support interactive transactions. Prefer port 5432 (session pooler or direct host), not 6543."
    );
    return withDirectConnectionSettings(stripTransactionPoolerParams(direct));
  }

  throw new Error(
    "Interactive database transactions require DIRECT_URL on port 5432 (session pooler or direct host), not the transaction pooler on 6543."
  );
}

function createPrismaClient() {
  const dbUrl = withPoolSettings(process.env.DATABASE_URL);
  const options: ConstructorParameters<typeof PrismaClient>[0] = {
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  };

  // Only override the datasource when a URL exists — passing `undefined` breaks `next build`
  if (dbUrl) {
    options.datasources = { db: { url: dbUrl } };
  }

  return new PrismaClient(options);
}

function createTransactionPrismaClient() {
  return new PrismaClient({
    datasources: { db: { url: resolveDirectDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getTransactionPrisma(): PrismaClient {
  if (!globalForPrisma.transactionPrisma) {
    globalForPrisma.transactionPrisma = createTransactionPrismaClient();
  }
  return globalForPrisma.transactionPrisma;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

/**
 * Run an interactive Prisma transaction on a direct Postgres connection.
 * Required with Supabase PgBouncer (port 6543) — pooled connections cannot hold open transactions.
 */
export function runInteractiveTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number }
): Promise<T> {
  return getTransactionPrisma().$transaction(fn, {
    maxWait: options?.maxWait ?? 15_000,
    timeout: options?.timeout ?? 60_000,
  });
}
