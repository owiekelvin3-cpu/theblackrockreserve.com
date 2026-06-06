import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function appendParam(url: string, param: string) {
  return `${url}${url.includes("?") ? "&" : "?"}${param}`;
}

function withPoolSettings(url: string | undefined) {
  if (!url) return url;
  let result = url;
  if (!result.includes("connect_timeout")) {
    result = appendParam(result, "connect_timeout=10");
  }
  if (!result.includes("pool_timeout")) {
    result = appendParam(result, "pool_timeout=20");
  }
  if (result.includes("pgbouncer") && !result.includes("connection_limit")) {
    result = appendParam(result, "connection_limit=5");
  }
  return result;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: withPoolSettings(process.env.DATABASE_URL),
      },
    },
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
