import { prisma } from "@/lib/prisma";
import { BalanceAdjustmentType, Prisma } from "@prisma/client";
import { logAdminAction } from "@/lib/admin-audit";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { formatCurrency } from "@/lib/utils";
import {
  buildAccountCreditNotification,
  buildCreditTransactionDescription,
  buildDebitTransactionDescription,
} from "@/lib/notification-helpers";

type Tx = Prisma.TransactionClient;

export async function adjustUserBalance(
  params: {
    userId: string;
    accountId: string;
    adminId: string;
    type: BalanceAdjustmentType;
    amount: number;
    reason: string;
    ipAddress?: string;
    skipAuditLog?: boolean;
    skipUserNotification?: boolean;
  },
  txClient?: Tx
) {
  const { userId, accountId, adminId, type, amount, reason, ipAddress, skipAuditLog, skipUserNotification } =
    params;

  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new Error("Amount must be a positive number");
  }

  if (!reason.trim()) {
    throw new Error("Reason is required");
  }

  const run = async (tx: Tx) => {
    const user = await tx.user.findFirst({
      where: { id: userId, role: "USER" },
    });
    if (!user) throw new Error("User not found");

    const account = await tx.bankAccount.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) throw new Error("Account not found");

    const balanceBefore = Number(account.balance);
    const delta = type === "CREDIT" ? amount : -amount;
    const balanceAfter = balanceBefore + delta;

    if (balanceAfter < 0) {
      throw new Error("Insufficient balance for deduction");
    }

    const updatedAccount = await tx.bankAccount.update({
      where: { id: accountId },
      data: { balance: balanceAfter },
    });

    const adjustment = await tx.balanceAdjustment.create({
      data: {
        userId,
        accountId,
        adminId,
        type,
        amount,
        reason: reason.trim(),
        balanceBefore,
        balanceAfter,
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        accountId,
        type: type === "CREDIT" ? "DEPOSIT" : "WITHDRAWAL",
        amount,
        description:
          type === "CREDIT"
            ? buildCreditTransactionDescription(reason.trim())
            : buildDebitTransactionDescription(reason.trim()),
        status: "COMPLETED",
      },
    });

    if (type === "CREDIT" && !skipUserNotification) {
      const { title, message } = buildAccountCreditNotification(formatCurrency(amount), reason.trim());
      await createUserNotification(
        {
          userId,
          type: "PAYMENT_RECEIVED",
          title,
          message,
        },
        tx
      );
    }

    return { adjustment, updatedAccount, balanceBefore, balanceAfter };
  };

  const result = txClient ? await run(txClient) : await prisma.$transaction(run);

  if (type === "CREDIT" && !skipUserNotification) {
    const { title, message } = buildAccountCreditNotification(formatCurrency(amount), reason.trim());
    await sendUserNotificationEmail({ userId, title, message });
  }

  if (!skipAuditLog && !txClient) {
    await logAdminAction(
      adminId,
      type === "CREDIT" ? "BALANCE_CREDIT" : "BALANCE_DEBIT",
      {
        userId,
        accountId,
        amount,
        reason: reason.trim(),
        balanceBefore: result.balanceBefore,
        balanceAfter: result.balanceAfter,
      },
      userId,
      ipAddress
    );
  }

  return result;
}
