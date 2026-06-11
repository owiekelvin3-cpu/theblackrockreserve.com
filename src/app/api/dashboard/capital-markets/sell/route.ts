import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { executeSell } from "@/lib/sell-service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/admin-audit";
import { sellSubmitSchema } from "@/lib/validations";
import { requireTransactionPin } from "@/lib/transaction-pin";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  const ip = getClientIp(req) ?? "unknown";
  const rateKey = `sell:${userId}:${ip}`;
  const rate = checkRateLimit(rateKey, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many sale requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = sellSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid sale data" },
      { status: 400 }
    );
  }

  const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
  if (pinError) return pinError;

  try {
    const result = await executeSell({
      userId,
      symbol: parsed.data.symbol,
      shares: parsed.data.shares,
      amountUsd: parsed.data.amountUsd
        ? Math.round(parsed.data.amountUsd * 100) / 100
        : undefined,
      accountId: parsed.data.accountId,
    });

    return NextResponse.json({ success: true, sale: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sale failed";
    const status =
      message.includes("Insufficient") ||
      message.includes("Minimum") ||
      message.includes("Duplicate") ||
      message.includes("do not hold") ||
      message.includes("too small") ||
      message.includes("Enter shares")
        ? 400
        : message.includes("not available")
          ? 404
          : 500;

    if (status === 500) console.error("Sale error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
