import { prisma } from "@/lib/prisma";
import { reduceProfitBalanceOnSpend } from "@/lib/spendable-balance";
import { ensureCheckingAndSavingsAccounts } from "@/lib/savings-service";
import { getAvailableBalance } from "@/lib/withdrawal-balance";
import { createUserNotification } from "@/lib/user-notifications";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export async function transferToMember(
  senderId: string,
  params: {
    accountId: string;
    recipientEmail: string;
    amount: number;
    note?: string;
  }
) {
  const amount = roundMoney(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount greater than zero");
  }

  const email = params.recipientEmail.trim().toLowerCase();
  if (!email.includes("@")) {
    throw new Error("Enter a valid recipient email address");
  }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { id: true, name: true, email: true, status: true },
  });
  if (!sender || sender.status !== "ACTIVE") {
    throw new Error("Your account cannot send transfers right now");
  }

  if (email === sender.email.toLowerCase()) {
    throw new Error("You cannot transfer funds to your own email address");
  }

  const recipient = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      role: "USER",
      status: "ACTIVE",
    },
    select: { id: true, name: true, email: true },
  });

  if (!recipient) {
    throw new Error("No active member account was found with that email address");
  }

  const senderAccount = await prisma.bankAccount.findFirst({
    where: { id: params.accountId, userId: senderId },
  });
  if (!senderAccount) throw new Error("Source account not found");

  const available = await getAvailableBalance(senderId, params.accountId);
  if (available == null || available < amount) {
    throw new Error("Insufficient available balance for this transfer");
  }

  const { checking: recipientChecking } = await ensureCheckingAndSavingsAccounts(recipient.id);
  const memo = params.note?.trim();
  const senderLabel = memo
    ? `Member transfer to ${recipient.email} — ${memo}`
    : `Member transfer to ${recipient.email}`;
  const recipientLabel = memo
    ? `Member transfer from ${sender.email} — ${memo}`
    : `Member transfer from ${sender.email}`;

  const result = await prisma.$transaction(async (tx) => {
    const fromAccount = await tx.bankAccount.findFirst({
      where: { id: senderAccount.id, userId: senderId },
    });
    const toAccount = await tx.bankAccount.findFirst({
      where: { id: recipientChecking.id, userId: recipient.id },
    });

    if (!fromAccount || !toAccount) throw new Error("Account not found");

    const fromBalance = Number(fromAccount.balance);
    if (fromBalance < amount) throw new Error("Insufficient balance");

    await tx.bankAccount.update({
      where: { id: fromAccount.id },
      data: { balance: roundMoney(fromBalance - amount) },
    });

    await reduceProfitBalanceOnSpend(tx, senderId, amount);

    await tx.bankAccount.update({
      where: { id: toAccount.id },
      data: { balance: roundMoney(Number(toAccount.balance) + amount) },
    });

    const debitTx = await tx.transaction.create({
      data: {
        userId: senderId,
        accountId: fromAccount.id,
        type: "TRANSFER",
        amount,
        description: senderLabel,
        status: "COMPLETED",
      },
    });

    await tx.transaction.create({
      data: {
        userId: recipient.id,
        accountId: toAccount.id,
        type: "TRANSFER",
        amount,
        description: recipientLabel,
        status: "COMPLETED",
      },
    });

    await createUserNotification(
      {
        userId: recipient.id,
        type: "MEMBER_TRANSFER",
        title: "Funds received",
        message: `${sender.name} sent you $${amount.toFixed(2)}.${memo ? ` Note: ${memo}` : ""}`,
      },
      tx
    );

    return debitTx;
  });

  return {
    amount,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    referenceId: result.id,
    message: `Successfully sent $${amount.toFixed(2)} to ${recipient.name}`,
    receipt: {
      id: result.id,
      amount,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      senderName: sender.name,
      senderEmail: sender.email,
      accountName: senderAccount.name,
      note: memo ?? null,
      createdAt: result.createdAt.toISOString(),
      status: "COMPLETED" as const,
    },
  };
}
