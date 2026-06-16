import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { memberTransferSchema } from "@/lib/validations";
import { transferToMember } from "@/lib/member-transfer-service";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { getAvailableBalancesMap } from "@/lib/withdrawal-balance";
import { prisma } from "@/lib/prisma";
import { ensureUserPrimaryAccountNumber } from "@/lib/bank-account-number";
import { getDbSchemaCapabilities } from "@/lib/db-schema-capabilities";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const caps = await getDbSchemaCapabilities();
    if (caps.bankAccountNumbers) {
      await ensureUserPrimaryAccountNumber(userId);
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { userId },
      select: { id: true, name: true, currency: true, balance: true },
      orderBy: { createdAt: "asc" },
    });

    const availableMap = await getAvailableBalancesMap(userId, accounts);

    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        balance: Number(a.balance),
        availableBalance: availableMap[a.id] ?? Number(a.balance),
      })),
    });
  } catch (error) {
    console.error("Transfers GET error:", error);
    return NextResponse.json({ error: "Failed to load transfer info" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = memberTransferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid transfer request" },
        { status: 400 }
      );
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const transfer = await transferToMember(userId, parsed.data);
    return NextResponse.json({ ok: true, ...transfer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
