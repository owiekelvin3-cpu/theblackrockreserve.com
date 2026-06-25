import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { getAvailableBalance } from "@/lib/withdrawal-balance";
import { createUserNotification } from "@/lib/user-notifications";
import {
  isValidBankAccountNumber,
  normalizeBankAccountNumber,
  findPrimaryCheckingAccount,
  getUserAccountNumber,
  resolveActiveMemberByAccountNumber,
} from "@/lib/bank-account-number";
import { formatMoneyForUser } from "@/lib/exchange-rates";
import { serializeVerificationBadge } from "@/lib/verification-badge";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export async function lookupMemberTransferRecipient(
  senderId: string,
  recipientAccountNumberRaw: string
) {
  const accountNumber = normalizeBankAccountNumber(recipientAccountNumberRaw);
  if (!isValidBankAccountNumber(accountNumber)) {
    return { found: false as const, reason: "invalid" as const };
  }

  const resolved = await resolveActiveMemberByAccountNumber(accountNumber);
  if (!resolved) {
    return { found: false as const, reason: "not_found" as const };
  }

  const recipient = resolved.user;
  if (recipient.id === senderId) {
    return { found: false as const, reason: "self" as const };
  }

  return {
    found: true as const,
    name: recipient.name,
    verificationBadge: serializeVerificationBadge(recipient.verificationBadge),
    accountNumber,
    accountName: resolved.primaryChecking.name ?? "Primary Checking",
  };
}

export async function transferToMember(
  senderId: string,
  params: {
    accountId: string;
    recipientAccountNumber: string;
    amount: number;
    note?: string;
  }
) {
  const amount = roundMoney(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Enter a valid amount greater than zero");
  }

  const accountNumber = normalizeBankAccountNumber(params.recipientAccountNumber);
  if (!isValidBankAccountNumber(accountNumber)) {
    throw new Error("Enter a valid recipient account number (e.g. BR-1234567890)");
  }

  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { id: true, name: true, status: true, verificationBadge: true, preferredCurrency: true },
  });
  if (!sender || sender.status !== "ACTIVE") {
    throw new Error("Your account cannot send transfers right now");
  }

  const resolved = await resolveActiveMemberByAccountNumber(accountNumber);
  if (!resolved) {
    throw new Error("No active member account was found with that account number");
  }

  const recipient = resolved.user;
  if (recipient.id === senderId) {
    throw new Error("You cannot transfer funds to your own account number");
  }

  const senderAccount = await prisma.bankAccount.findFirst({
    where: { id: params.accountId, userId: senderId },
  });
  if (!senderAccount) throw new Error("Source account not found");

  const available = await getAvailableBalance(senderId, params.accountId);
  if (available == null || available < amount) {
    throw new Error("Insufficient available balance for this transfer");
  }

  const memo = params.note?.trim();
  const senderLabel = memo
    ? `Transfer to ${recipient.name} — ${memo}`
    : `Transfer to ${recipient.name}`;
  const recipientLabel = memo
    ? `Transfer from ${sender.name} — ${memo}`
    : `Transfer from ${sender.name}`;

  const recipientUser = await prisma.user.findUnique({
    where: { id: recipient.id },
    select: { preferredCurrency: true },
  });

  const recipientAmountLabel = await formatMoneyForUser(amount, recipientUser?.preferredCurrency);
  const senderAmountLabel = await formatMoneyForUser(amount, sender.preferredCurrency);

  const result = await runInteractiveTransaction(async (tx) => {
    const fromAccount = await tx.bankAccount.findFirst({
      where: { id: senderAccount.id, userId: senderId },
    });
    const toAccount = await findPrimaryCheckingAccount(recipient.id, tx);

    if (!fromAccount || !toAccount) throw new Error("Account not found");

    const fromBalance = Number(fromAccount.balance);
    if (fromBalance < amount) throw new Error("Insufficient balance");

    await tx.bankAccount.update({
      where: { id: fromAccount.id },
      data: { balance: roundMoney(fromBalance - amount) },
    });

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
        counterpartyUserId: recipient.id,
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
        counterpartyUserId: senderId,
      },
    });

    await createUserNotification(
      {
        userId: recipient.id,
        type: "MEMBER_TRANSFER",
        title: "Funds received",
        message: `${sender.name} sent you ${recipientAmountLabel}.${memo ? ` Note: ${memo}` : ""}`,
        actorUserId: senderId,
      },
      tx
    );

    return debitTx;
  });

  const senderAccountNumber = await getUserAccountNumber(senderId);

  return {
    amount,
    recipientAccountNumber: accountNumber,
    recipientName: recipient.name,
    referenceId: result.id,
    message: `Successfully sent ${senderAmountLabel} to ${recipient.name}`,
    receipt: {
      id: result.id,
      amount,
      recipientAccountNumber: accountNumber,
      recipientName: recipient.name,
      recipientVerificationBadge: serializeVerificationBadge(recipient.verificationBadge),
      senderName: sender.name,
      senderVerificationBadge: serializeVerificationBadge(sender.verificationBadge),
      senderAccountNumber,
      accountName: senderAccount.name,
      note: memo ?? null,
      createdAt: result.createdAt.toISOString(),
      status: "COMPLETED" as const,
    },
  };
}
