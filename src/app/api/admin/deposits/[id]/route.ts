import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { depositReviewSchema } from "@/lib/validations";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { adjustUserBalance } from "@/lib/balance-adjustment";
import { formatDepositStatus } from "@/lib/deposit-status";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import { buildDepositClearedNotification } from "@/lib/notification-helpers";
import { prisma } from "@/lib/prisma";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = depositReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const deposit = await prisma.depositRequest.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, name: true, email: true, accounts: true } } },
    });

    if (!deposit) return NextResponse.json({ error: "Deposit not found" }, { status: 404 });
    if (deposit.status !== "PENDING") {
      return NextResponse.json({ error: "Deposit already reviewed" }, { status: 400 });
    }

    const creditAmount =
      parsed.data.status === "APPROVED"
        ? parsed.data.creditAmount ?? (deposit.amountUsd ? Number(deposit.amountUsd) : undefined)
        : undefined;

    if (parsed.data.status === "APPROVED" && (!creditAmount || creditAmount <= 0)) {
      return NextResponse.json({ error: "Credit amount is required to approve a deposit" }, { status: 400 });
    }

    const accountId =
      parsed.data.accountId ?? deposit.accountId ?? deposit.user.accounts[0]?.id;

    if (parsed.data.status === "APPROVED" && !accountId) {
      return NextResponse.json({ error: "No account to credit" }, { status: 400 });
    }

    const ip = getClientIp(req);
    const reviewNote = parsed.data.reviewNote?.trim() || null;
    let emailPayload: { userId: string; title: string; message: string } | null = null;

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.data.status === "APPROVED" && creditAmount && accountId) {
        await adjustUserBalance(
          {
            userId: deposit.userId,
            accountId,
            adminId: session.user.id,
            type: "CREDIT",
            amount: creditAmount,
            reason: `Bitcoin deposit approved (TX: ${deposit.txHash ?? "N/A"})`,
            ipAddress: ip,
            skipAuditLog: true,
            skipUserNotification: true,
          },
          tx
        );
      }

      const row = await tx.depositRequest.update({
        where: { id: params.id },
        data: {
          status: parsed.data.status,
          reviewNote,
          reviewedBy: session.user.id,
        },
      });

      if (parsed.data.status === "APPROVED" && creditAmount) {
        const amountLabel = formatCurrency(creditAmount);
        const { title, message } = buildDepositClearedNotification(amountLabel);
        await createUserNotification(
          {
            userId: deposit.userId,
            type: "DEPOSIT_APPROVED",
            title,
            message,
            depositId: deposit.id,
          },
          tx
        );
        emailPayload = { userId: deposit.userId, title, message };
      }

      if (parsed.data.status === "REJECTED") {
        const reason = reviewNote ?? "Please contact support for assistance.";
        const title = "Deposit could not be processed";
        const message = `We were unable to confirm your recent deposit at this time. ${reason}`;
        await createUserNotification(
          {
            userId: deposit.userId,
            type: "DEPOSIT_REJECTED",
            title,
            message,
            depositId: deposit.id,
          },
          tx
        );
        emailPayload = { userId: deposit.userId, title, message };
      }

      return row;
    });

    if (emailPayload) {
      await sendUserNotificationEmail(emailPayload);
    }

    await logAdminAction(
      session.user.id,
      parsed.data.status === "APPROVED" ? "DEPOSIT_APPROVED" : "DEPOSIT_REJECTED",
      {
        depositId: params.id,
        txHash: deposit.txHash,
        creditAmount,
        reviewNote,
      },
      deposit.userId,
      ip
    );

    invalidateAdminCaches();

    return NextResponse.json({
      deposit: {
        ...updated,
        statusLabel: formatDepositStatus(updated.status),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review deposit";
    console.error("Deposit review error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
