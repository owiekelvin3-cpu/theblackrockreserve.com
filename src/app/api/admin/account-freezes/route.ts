import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { accountFreezeUpdateSchema } from "@/lib/validations";
import { getFrozenAccounts, updateFreezeReason } from "@/lib/account-freeze";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const freezes = await getFrozenAccounts({ search });
    return NextResponse.json({ freezes });
  } catch (error) {
    console.error("Frozen accounts GET error:", error);
    return NextResponse.json({ error: "Failed to load frozen accounts" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = accountFreezeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const freezeId = body.freezeId as string | undefined;
    if (!freezeId) {
      return NextResponse.json({ error: "freezeId is required" }, { status: 400 });
    }

    const freeze = await updateFreezeReason({
      freezeId,
      adminId: session.user.id,
      reason: parsed.data.reason,
      internalNotes: parsed.data.internalNotes,
      ipAddress: getClientIp(req),
    });

    invalidateAdminCaches();
    return NextResponse.json({ success: true, freeze });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update freeze";
    console.error("Freeze update error:", error);
    return NextResponse.json({ error: message }, { status: message.includes("not found") ? 404 : 500 });
  }
}
