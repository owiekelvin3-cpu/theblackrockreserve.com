import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { withdrawFromJointAccount } from "@/lib/joint-account-service";
import { jointMoneyActionSchema } from "@/lib/validations";
import { requireTransactionPin } from "@/lib/transaction-pin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = jointMoneyActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid amount" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const result = await withdrawFromJointAccount({
      jointAccountId: params.id,
      userId,
      amount: Math.round(parsed.data.amount * 100) / 100,
      personalAccountId: parsed.data.personalAccountId,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Withdrawal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
