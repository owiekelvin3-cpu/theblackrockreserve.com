import { NextRequest, NextResponse } from "next/server";
import { accrueAllInvestmentProfits } from "@/lib/investment-accrual";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  const querySecret = req.nextUrl.searchParams.get("secret");

  if (secret) {
    return auth === `Bearer ${secret}` || headerSecret === secret || querySecret === secret;
  }

  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await accrueAllInvestmentProfits();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Daily investment profit cron error:", error);
    return NextResponse.json({ error: "Failed to accrue daily profits" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
