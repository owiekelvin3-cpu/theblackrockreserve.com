import { NextRequest, NextResponse } from "next/server";
import { refreshMarketAssetPrices } from "@/lib/refresh-market-prices";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const vercelCron = req.headers.get("x-vercel-cron") === "1";

  if (secret) {
    return auth === `Bearer ${secret}` || headerSecret === secret || querySecret === secret;
  }
  if (vercelCron) return true;
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshMarketAssetPrices(true);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Market price refresh cron error:", error);
    return NextResponse.json({ error: "Failed to refresh market prices" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
