import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { savingsTransferSchema } from "@/lib/validations";
import { transferSavings } from "@/lib/savings-service";
import { requireTransactionPin } from "@/lib/transaction-pin";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = savingsTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const savings = await transferSavings(userId, parsed.data);
    return NextResponse.json({ ok: true, savings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
