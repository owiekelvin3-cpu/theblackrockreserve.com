import { NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import {
  getPrismaQueryStatsSnapshot,
  isPrismaQueryStatsEnabled,
  resetPrismaQueryStats,
} from "@/lib/prisma-query-stats";
import {
  getApiRequestStatsSnapshot,
  isApiRequestStatsEnabled,
  resetApiRequestStats,
} from "@/lib/api-request-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  if (!isPrismaQueryStatsEnabled() && !isApiRequestStatsEnabled()) {
    return NextResponse.json(
      {
        error:
          "Stats disabled. Set PRISMA_QUERY_STATS=1 and/or API_REQUEST_STATS=1 on the server, redeploy, then revisit this endpoint.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    prisma: getPrismaQueryStatsSnapshot(),
    api: getApiRequestStatsSnapshot(),
  });
}

export async function DELETE() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  resetPrismaQueryStats();
  resetApiRequestStats();
  return NextResponse.json({ reset: true });
}
