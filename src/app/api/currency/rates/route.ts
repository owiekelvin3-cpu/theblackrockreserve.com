import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

export async function GET() {
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
