import { NextRequest, NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/exchange-rates";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request) ?? "anonymous";
  const limited = checkRateLimit(`currency:rates:${ip}`, 120, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { rates, fetchedAt, stale } = await getExchangeRates();
    return NextResponse.json(
      { base: "USD", rates, fetchedAt, stale },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("Currency rates API error:", error);
    return NextResponse.json({ error: "Failed to load exchange rates" }, { status: 500 });
  }
}
