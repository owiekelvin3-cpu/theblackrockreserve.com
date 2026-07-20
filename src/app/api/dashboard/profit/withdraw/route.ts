import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { profitWithdrawSchema } from "@/lib/validations";
import { withdrawProfitToMain } from "@/lib/profit-service";
import {
  createProfitTaxGatedWithdrawal,
  getActiveUserProfitTax,
} from "@/lib/profit-tax";
import { requireTransactionPin } from "@/lib/transaction-pin";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = profitWithdrawSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const tax = await getActiveUserProfitTax(userId);
    if (tax) {
      const gated = await createProfitTaxGatedWithdrawal(userId, parsed.data.amount);
      return NextResponse.json({
        ok: true,
        requiresTaxPayment: true,
        taxPaymentUrl: gated.taxPaymentUrl,
        profitWithdrawalRequestId: gated.id,
        amountUsd: gated.amountUsd,
        assignedTaxAmount: gated.assignedTaxAmount,
        taxPercentage: gated.taxPercentage,
        message: "Complete your tax payment to release profit to your main balance.",
      });
    }

    const result = await withdrawProfitToMain(userId, parsed.data.amount);
    return NextResponse.json({ ok: true, requiresTaxPayment: false, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Withdrawal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
