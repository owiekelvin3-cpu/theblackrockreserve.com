import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getPendingApprovals } from "@/lib/joint-account-service";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const approvals = await getPendingApprovals(userId);
    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("Joint approvals GET error:", error);
    return NextResponse.json({ error: "Failed to load approvals" }, { status: 500 });
  }
}
