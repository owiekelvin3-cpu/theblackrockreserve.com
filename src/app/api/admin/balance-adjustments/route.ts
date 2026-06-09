import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getBalanceAdjustments } from "@/lib/admin-audit";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);

  try {
    const adjustments = await getBalanceAdjustments(limit, userId);
    return NextResponse.json({ adjustments });
  } catch (error) {
    console.error("Balance adjustments error:", error);
    return NextResponse.json({ error: "Failed to load adjustments" }, { status: 500 });
  }
}
