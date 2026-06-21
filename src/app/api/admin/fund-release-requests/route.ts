import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { fundReleaseReviewSchema } from "@/lib/validations";
import { getFundReleaseRequests, reviewFundReleaseRequest } from "@/lib/account-freeze";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null;
    const requests = await getFundReleaseRequests(status ?? undefined);
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Fund release requests GET error:", error);
    return NextResponse.json({ error: "Failed to load fund release requests" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = fundReleaseReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const requestId = body.requestId as string | undefined;
    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    await reviewFundReleaseRequest({
      requestId,
      adminId: session.user.id,
      action: parsed.data.action,
      adminNotes: parsed.data.adminNotes,
      ipAddress: getClientIp(req),
    });

    invalidateAdminCaches();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review request";
    console.error("Fund release review error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
