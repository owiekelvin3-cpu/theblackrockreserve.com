import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getAdminAuditLogs } from "@/lib/admin-audit";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 50);

  try {
    const logs = await getAdminAuditLogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
