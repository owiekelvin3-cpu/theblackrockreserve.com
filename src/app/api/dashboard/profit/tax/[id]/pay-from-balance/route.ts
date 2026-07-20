import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { profitTaxPayFromBalanceSchema } from "@/lib/validations";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { payProfitTaxFromBalance } from "@/lib/profit-tax";
import { formatCurrency } from "@/lib/utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = profitTaxPayFromBalanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const result = await payProfitTaxFromBalance(userId, id);

    return NextResponse.json({
      success: true,
      message: `Tax paid from your main balance. ${formatCurrency(result.profitAmount)} has been credited to your account.`,
      profitAmount: result.profitAmount,
      taxAmount: result.amountUsd,
      mainBalance: result.mainBalance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to pay tax from balance";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
