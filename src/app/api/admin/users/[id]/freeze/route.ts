import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { accountFreezeSchema } from "@/lib/validations";
import { freezeUserAccount, getAccountFreezeHistory } from "@/lib/account-freeze";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = accountFreezeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const freeze = await freezeUserAccount({
      userId: params.id,
      adminId: session.user.id,
      freezeType: parsed.data.freezeType,
      reason: parsed.data.reason,
      internalNotes: parsed.data.internalNotes,
      ipAddress: getClientIp(req),
    });

    invalidateAdminCaches();
    return NextResponse.json({ success: true, freeze });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to freeze account";
    const status = message.includes("already frozen") ? 409 : message.includes("not found") ? 404 : 500;
    console.error("Freeze account error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const history = await getAccountFreezeHistory(params.id);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Freeze history error:", error);
    return NextResponse.json({ error: "Failed to load freeze history" }, { status: 500 });
  }
}
