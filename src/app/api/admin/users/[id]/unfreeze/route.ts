import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { unfreezeUserAccount } from "@/lib/account-freeze";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes : undefined;

    await unfreezeUserAccount({
      userId: params.id,
      adminId: session.user.id,
      ipAddress: getClientIp(req),
      notes,
    });

    invalidateAdminCaches();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unfreeze account";
    const status = message.includes("No active freeze") ? 404 : 500;
    console.error("Unfreeze account error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
