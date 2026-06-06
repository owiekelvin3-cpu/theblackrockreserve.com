import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getCapitalMarketsData } from "@/lib/capital-markets";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const data = await getCapitalMarketsData(userId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Capital markets fetch error:", error);
    return NextResponse.json({ error: "Failed to load capital markets data" }, { status: 500 });
  }
}
