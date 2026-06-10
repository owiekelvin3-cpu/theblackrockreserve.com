import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { getClientIp } from "@/lib/admin-audit";
import { investFromJointAccount } from "@/lib/joint-account-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { jointInvestSchema } from "@/lib/validations";
import { requireTransactionPin } from "@/lib/transaction-pin";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const rate = checkRateLimit(`joint-invest:${userId}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = jointInvestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const result = await investFromJointAccount({
      jointAccountId: params.id,
      userId,
      symbol: parsed.data.symbol.toUpperCase(),
      amountUsd: Math.round(parsed.data.amountUsd * 100) / 100,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Investment failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
