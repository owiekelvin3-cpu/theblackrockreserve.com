import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { withdrawalReviewSchema } from "@/lib/validations";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { getAvailableBalance } from "@/lib/withdrawal-balance";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";
import { assertWithdrawalCanBeApproved } from "@/lib/withdrawal-charge";
import { reduceProfitBalanceOnSpend } from "@/lib/spendable-balance";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = withdrawalReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!withdrawal) return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
    if (withdrawal.status !== "PENDING") {
      return NextResponse.json({ error: "Withdrawal already reviewed or awaiting charge payment" }, { status: 400 });
    }

    const amount = Number(withdrawal.amountUsd);
    let emailPayload: { userId: string; title: string; message: string } | null = null;

    if (parsed.data.status === "APPROVED") {
      try {
        await assertWithdrawalCanBeApproved(params.id);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Withdrawal charge must be paid before approval" },
          { status: 400 }
        );
      }
      const available = await getAvailableBalance(withdrawal.userId, withdrawal.accountId, withdrawal.id);
      if (available === null) {
        return NextResponse.json({ error: "Account not found" }, { status: 400 });
      }
      if (amount > available) {
        return NextResponse.json(
          { error: `Insufficient available balance ($${available.toFixed(2)} after other pending requests)` },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        const account = await tx.bankAccount.findFirst({
          where: { id: withdrawal.accountId, userId: withdrawal.userId },
        });
        if (!account) throw new Error("Account not found");

        const balanceBefore = Number(account.balance);
        if (balanceBefore < amount) throw new Error("Insufficient balance");

        await tx.bankAccount.update({
          where: { id: withdrawal.accountId },
          data: { balance: balanceBefore - amount },
        });

        await reduceProfitBalanceOnSpend(tx, withdrawal.userId, amount);

        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            accountId: withdrawal.accountId,
            type: "WITHDRAWAL",
            amount,
            description: `${getWithdrawalMethodLabel(withdrawal.method)} withdrawal to ${withdrawal.destination.slice(0, 20)}…`,
            status: "COMPLETED",
          },
        });

        await tx.withdrawalRequest.update({
          where: { id: params.id },
          data: {
            status: "APPROVED",
            reviewNote: parsed.data.reviewNote,
            reviewedBy: session.user.id,
          },
        });

        const title = "Withdrawal processed";
        const message = `Your ${getWithdrawalMethodLabel(withdrawal.method)} withdrawal of ${formatCurrency(amount)} has been approved and sent.`;
        await createUserNotification(
          {
            userId: withdrawal.userId,
            type: "WITHDRAWAL_APPROVED",
            title,
            message,
          },
          tx
        );
        emailPayload = { userId: withdrawal.userId, title, message };
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.withdrawalRequest.update({
          where: { id: params.id },
          data: {
            status: "REJECTED",
            reviewNote: parsed.data.reviewNote,
            reviewedBy: session.user.id,
          },
        });

        const title = "Withdrawal not approved";
        const message = `Your withdrawal request of ${formatCurrency(amount)} was not approved.${parsed.data.reviewNote ? ` Reason: ${parsed.data.reviewNote}` : ""}`;
        await createUserNotification(
          {
            userId: withdrawal.userId,
            type: "WITHDRAWAL_REJECTED",
            title,
            message,
          },
          tx
        );
        emailPayload = { userId: withdrawal.userId, title, message };
      });
    }

    if (emailPayload) {
      await sendUserNotificationEmail(emailPayload);
    }

    const updated = await prisma.withdrawalRequest.findUnique({ where: { id: params.id } });

    await logAdminAction(
      session.user.id,
      parsed.data.status === "APPROVED" ? "WITHDRAWAL_APPROVED" : "WITHDRAWAL_REJECTED",
      {
        withdrawalId: params.id,
        amountUsd: amount,
        method: withdrawal.method,
        destination: withdrawal.destination,
        reviewNote: parsed.data.reviewNote,
      },
      withdrawal.userId,
      getClientIp(req)
    );

    invalidateAdminCaches();

    return NextResponse.json({ withdrawal: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review withdrawal";
    console.error("Withdrawal review error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
