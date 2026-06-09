import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { adjustUserBalance } from "@/lib/balance-adjustment";
import { balanceAdjustmentSchema } from "@/lib/validations";
import { getClientIp } from "@/lib/admin-audit";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = balanceAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const result = await adjustUserBalance({
      userId: params.id,
      accountId: parsed.data.accountId,
      adminId: session.user.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      ipAddress: getClientIp(req),
    });

    invalidateAdminCaches();

    return NextResponse.json({
      success: true,
      balance: Number(result.updatedAccount.balance),
      adjustmentId: result.adjustment.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to adjust balance";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
