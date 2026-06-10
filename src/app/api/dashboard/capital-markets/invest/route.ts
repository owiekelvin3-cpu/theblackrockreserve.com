import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { executeInvestment } from "@/lib/investment-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-audit";
import { sendInvestmentConfirmationEmail } from "@/lib/money-notifications";
import { investSubmitSchema } from "@/lib/validations";
import { requireTransactionPin } from "@/lib/transaction-pin";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const ip = getClientIp(req) ?? "unknown";
  const rateKey = `invest:${userId}:${ip}`;
  const rate = checkRateLimit(rateKey, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many investment requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = investSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid investment data" },
      { status: 400 }
    );
  }

  const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
  if (pinError) return pinError;

  try {
    const result = await executeInvestment({
      userId,
      symbol: parsed.data.symbol,
      amountUsd: Math.round(parsed.data.amountUsd * 100) / 100,
      accountId: parsed.data.accountId,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    void sendInvestmentConfirmationEmail({
      userId,
      symbol: result.symbol,
      assetName: result.assetName,
      amountUsd: result.amountUsd,
      shares: result.shares,
      fee: result.fee,
      totalCost: result.totalCost,
      newBalance: result.newBalance,
    }).catch((err) => console.error("Investment email error:", err));

    return NextResponse.json({ success: true, investment: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Investment failed";
    const status =
      message.includes("Insufficient") || message.includes("Minimum") || message.includes("Duplicate")
        ? 400
        : message.includes("not available")
          ? 404
          : 500;

    if (status === 500) console.error("Investment error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
