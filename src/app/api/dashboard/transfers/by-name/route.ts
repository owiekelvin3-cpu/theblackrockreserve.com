import { NextResponse } from "next/server";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { memberTransferByNameSchema } from "@/lib/validations";
import { transferByRecipientName } from "@/lib/member-transfer-service";
import { requireTransactionPin } from "@/lib/transaction-pin";
import { getActiveAccountFreeze, isTransferBlocked } from "@/lib/account-freeze";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { verificationBadge: true },
    });
    if (sender?.verificationBadge !== "GOLD") {
      return NextResponse.json(
        { error: "Transfer by name is available for Gold verified members only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = memberTransferByNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid transfer request" },
        { status: 400 }
      );
    }

    const pinError = await requireTransactionPin(userId, parsed.data.transactionPin);
    if (pinError) return pinError;

    const activeFreeze = await getActiveAccountFreeze(userId);
    if (activeFreeze && isTransferBlocked(activeFreeze.freezeType)) {
      return NextResponse.json(
        {
          error: "Account frozen — transfers are temporarily disabled",
          accountFrozen: true,
          reason: activeFreeze.reason,
        },
        { status: 403 }
      );
    }

    const transfer = await transferByRecipientName(userId, parsed.data);
    return NextResponse.json({ ok: true, ...transfer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
