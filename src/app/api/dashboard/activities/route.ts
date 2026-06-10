import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { queryActivities, type ActivityCategory } from "@/lib/activity-service";
import type { TransactionStatus } from "@prisma/client";

const CATEGORIES = new Set([
  "all", "deposits", "withdrawals", "investments", "profits", "transfers", "account_updates", "security",
]);

const STATUSES = new Set(["all", "COMPLETED", "PENDING", "FAILED"]);

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const sp = request.nextUrl.searchParams;
  const page = Number(sp.get("page") ?? "1");
  const limit = Number(sp.get("limit") ?? "2");
  const category = (sp.get("category") ?? "all") as ActivityCategory | "all";
  const status = (sp.get("status") ?? "all") as TransactionStatus | "all";
  const search = sp.get("search") ?? undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;

  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const data = await queryActivities({
      userId,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 2,
      category,
      status,
      search,
      from,
      to,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Activities error:", error);
    return NextResponse.json({ error: "Failed to load activities" }, { status: 500 });
  }
}
