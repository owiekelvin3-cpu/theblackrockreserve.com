import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { runAdminGlobalSearch } from "@/lib/admin-search";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 30) : 20;

  if (q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  try {
    const results = await runAdminGlobalSearch(q, limit);
    return NextResponse.json({ results, query: q });
  } catch (error) {
    console.error("Admin search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
