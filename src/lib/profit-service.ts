import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-audit";
import { createUserNotification, sendUserNotificationEmail } from "@/lib/user-notifications";
import { ensureUserBankAccounts } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";
import { profitAddedEmail, profitRemovedEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

export async function addUserProfit(params: {
  userId: string;
  adminId: string;
  amount: number;
  reason: string;
  accountId?: string;
  ipAddress?: string;
}) {
  const { userId, adminId, amount, reason, accountId, ipAddress } = params;

  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new Error("Profit amount must be a positive number");
  }
  if (!reason.trim()) throw new Error("Reason is required");

  const user = await prisma.user.findFirst({
    where: { id: userId, role: "USER" },
    select: { id: true, name: true, email: true, profitBalance: true },
  });
  if (!user) throw new Error("User not found");

  const bankAccounts = await ensureUserBankAccounts(userId);
  const account =
    (accountId ? bankAccounts.find((a) => a.id === accountId) : null) ??
    bankAccounts.find((a) => a.type === "checking") ??
    bankAccounts[0];
  if (!account) throw new Error("No bank account found for user");

  const profitBefore = Number(user.profitBalance);
  const balanceBefore = Number(account.balance);
  const profitAfter = Math.round((profitBefore + amount) * 100) / 100;
  const balanceAfter = balanceBefore;

  const result = await runInteractiveTransaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { profitBalance: profitAfter },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        type: "PROFIT_CREDIT",
        amount,
        description: `Investment profit credited — ${reason.trim()}`,
        status: "COMPLETED",
      },
    });

    const adjustment = await tx.profitAdjustment.create({
      data: {
        userId,
        accountId: account.id,
        adminId,
        type: "CREDIT",
        amount,
        reason: reason.trim(),
        profitBefore,
        profitAfter,
        balanceBefore,
        balanceAfter,
        transactionId: transaction.id,
      },
    });

    return { transaction, adjustment };
  });

  const amountLabel = formatCurrency(amount);
  const title = "Investment profit credited";
  const message = `${amountLabel} has been added to your profit balance. Withdraw to your main balance when ready. ${reason.trim()}`;

  await createUserNotification({ userId, type: "PROFIT_CREDIT", title, message });
  await sendUserNotificationEmail({ userId, title, message });

  const mail = profitAddedEmail({
    name: user.name,
    amount: amountLabel,
    profitBalance: formatCurrency(profitAfter),
    mainBalance: formatCurrency(balanceAfter),
    reason: reason.trim(),
    siteUrl: getSiteUrl(),
  });
  await sendEmailSafe(user.email, mail);

  await logAdminAction(
    adminId,
    "PROFIT_CREDIT",
    {
      userId,
      amount,
      reason: reason.trim(),
      profitBefore,
      profitAfter,
      balanceBefore,
      balanceAfter,
      transactionId: result.transaction.id,
      adjustmentId: result.adjustment.id,
    },
    userId,
    ipAddress
  );

  return {
    transactionId: result.transaction.id,
    adjustmentId: result.adjustment.id,
    profitBalance: profitAfter,
    mainBalance: balanceAfter,
  };
}

export async function removeUserProfit(params: {
  userId: string;
  adminId: string;
  amount: number;
  reason: string;
  accountId?: string;
  ipAddress?: string;
}) {
  const { userId, adminId, amount, reason, accountId, ipAddress } = params;

  if (amount <= 0 || !Number.isFinite(amount)) {
    throw new Error("Amount must be a positive number");
  }
  if (!reason.trim()) throw new Error("Reason is required");

  const user = await prisma.user.findFirst({
    where: { id: userId, role: "USER" },
    select: { id: true, name: true, email: true, profitBalance: true },
  });
  if (!user) throw new Error("User not found");

  const profitBefore = Number(user.profitBalance);
  if (profitBefore < amount) {
    throw new Error(`Insufficient profit balance (${formatCurrency(profitBefore)} available)`);
  }

  const bankAccounts = await ensureUserBankAccounts(userId);
  const account =
    (accountId ? bankAccounts.find((a) => a.id === accountId) : null) ??
    bankAccounts.find((a) => a.type === "checking") ??
    bankAccounts[0];
  if (!account) throw new Error("No bank account found for user");

  const balanceBefore = Number(account.balance);
  const profitAfter = Math.round((profitBefore - amount) * 100) / 100;
  const balanceAfter = balanceBefore;

  const result = await runInteractiveTransaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { profitBalance: profitAfter },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        type: "PROFIT_DEBIT",
        amount,
        description: `Investment profit adjustment — ${reason.trim()}`,
        status: "COMPLETED",
      },
    });

    const adjustment = await tx.profitAdjustment.create({
      data: {
        userId,
        accountId: account.id,
        adminId,
        type: "DEBIT",
        amount,
        reason: reason.trim(),
        profitBefore,
        profitAfter,
        balanceBefore,
        balanceAfter,
        transactionId: transaction.id,
      },
    });

    return { transaction, adjustment };
  });

  const amountLabel = formatCurrency(amount);
  const title = "Investment profit adjusted";
  const message = `${amountLabel} was removed from your profit balance. ${reason.trim()}`;

  await createUserNotification({ userId, type: "PROFIT_DEBIT", title, message });
  await sendUserNotificationEmail({ userId, title, message });

  const mail = profitRemovedEmail({
    name: user.name,
    amount: amountLabel,
    profitBalance: formatCurrency(profitAfter),
    mainBalance: formatCurrency(balanceAfter),
    reason: reason.trim(),
    siteUrl: getSiteUrl(),
  });
  await sendEmailSafe(user.email, mail);

  await logAdminAction(
    adminId,
    "PROFIT_DEBIT",
    {
      userId,
      amount,
      reason: reason.trim(),
      profitBefore,
      profitAfter,
      balanceBefore,
      balanceAfter,
      transactionId: result.transaction.id,
      adjustmentId: result.adjustment.id,
    },
    userId,
    ipAddress
  );

  return {
    transactionId: result.transaction.id,
    adjustmentId: result.adjustment.id,
    profitBalance: profitAfter,
    mainBalance: balanceAfter,
  };
}

/** Move funds from the user's profit balance into their primary checking account. */
export async function withdrawProfitToMain(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount greater than zero");
  }

  const rounded = Math.round(amount * 100) / 100;

  const user = await prisma.user.findFirst({
    where: { id: userId, role: "USER" },
    select: { id: true, name: true, email: true, profitBalance: true },
  });
  if (!user) throw new Error("User not found");

  const profitBefore = Number(user.profitBalance);
  if (profitBefore < rounded) {
    throw new Error(
      `Insufficient profit balance (${formatCurrency(profitBefore)} available)`
    );
  }

  const bankAccounts = await ensureUserBankAccounts(userId);
  const account =
    bankAccounts.find((a) => a.type === "checking") ?? bankAccounts[0];
  if (!account) throw new Error("No bank account found for user");

  const balanceBefore = Number(account.balance);
  const profitAfter = Math.round((profitBefore - rounded) * 100) / 100;
  const balanceAfter = Math.round((balanceBefore + rounded) * 100) / 100;

  const result = await runInteractiveTransaction(async (tx) => {
    const freshUser = await tx.user.findUnique({
      where: { id: userId },
      select: { profitBalance: true },
    });
    if (!freshUser) throw new Error("User not found");

    const liveProfit = Number(freshUser.profitBalance);
    if (liveProfit < rounded) {
      throw new Error(
        `Insufficient profit balance (${formatCurrency(liveProfit)} available)`
      );
    }

    const bankAccount = await tx.bankAccount.findFirst({
      where: { id: account.id, userId },
    });
    if (!bankAccount) throw new Error("Account not found");

    const liveBalance = Number(bankAccount.balance);

    await tx.user.update({
      where: { id: userId },
      data: { profitBalance: Math.round((liveProfit - rounded) * 100) / 100 },
    });

    await tx.bankAccount.update({
      where: { id: account.id },
      data: { balance: Math.round((liveBalance + rounded) * 100) / 100 },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        accountId: account.id,
        type: "PROFIT_CREDIT",
        amount: rounded,
        description: "Profit withdrawn to main balance",
        status: "COMPLETED",
      },
    });

    return { transaction };
  });

  const amountLabel = formatCurrency(rounded);
  const title = "Profit moved to main balance";
  const message = `${amountLabel} was transferred from your profit balance to your main account.`;

  await createUserNotification({ userId, type: "PROFIT_WITHDRAWAL", title, message });
  await sendUserNotificationEmail({ userId, title, message });

  return {
    transactionId: result.transaction.id,
    profitBalance: profitAfter,
    mainBalance: balanceAfter,
    amount: rounded,
  };
}

async function sendEmailSafe(
  to: string,
  mail: { subject: string; html: string; text: string }
) {
  try {
    return await sendEmail({ to, ...mail });
  } catch (error) {
    console.error("Profit notification email failed:", error);
    return { sent: false as const };
  }
}

export async function getProfitAdjustments(limit = 50, userId?: string) {
  const rows = await prisma.profitAdjustment.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      admin: { select: { id: true, name: true, email: true } },
      account: { select: { id: true, name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    transactionId: r.transactionId,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    adminName: r.admin.name,
    accountName: r.account.name,
    type: r.type,
    amount: Number(r.amount),
    reason: r.reason,
    profitBefore: Number(r.profitBefore),
    profitAfter: Number(r.profitAfter),
    balanceBefore: Number(r.balanceBefore),
    balanceAfter: Number(r.balanceAfter),
    createdAt: r.createdAt.toISOString(),
  }));
}
