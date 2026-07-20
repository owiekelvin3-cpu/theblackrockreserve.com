import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDbSchemaCapabilities } from "@/lib/db-schema-capabilities";

type DbClient = PrismaClient | Prisma.TransactionClient;

export function generateBankAccountNumber(): string {
  const n = Math.floor(1000000000 + Math.random() * 9000000000);
  return `BR-${n}`;
}

export function normalizeBankAccountNumber(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  if (/^BR-\d{10}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `BR-${digits}`;
  return trimmed;
}

export function isValidBankAccountNumber(raw: string): boolean {
  return /^BR-\d{10}$/.test(normalizeBankAccountNumber(raw));
}

/** Display format: BR 1234 5678 90 */
export function formatBankAccountNumberDisplay(raw: string): string {
  const normalized = normalizeBankAccountNumber(raw);
  const match = normalized.match(/^BR-(\d{4})(\d{4})(\d{2})$/);
  if (!match) return normalized;
  return `BR ${match[1]} ${match[2]} ${match[3]}`;
}

/** Masked display: BR •••• •••• 7890 */
export function maskBankAccountNumberDisplay(raw: string): string {
  const normalized = normalizeBankAccountNumber(raw);
  const match = normalized.match(/^BR-(\d{6})(\d{4})$/);
  if (!match) return "BR •••• •••• ••••";
  return `BR •••• •••• ${match[2]}`;
}

export function formatBankAccountNumberCompact(raw: string): string {
  return normalizeBankAccountNumber(raw);
}

async function allocateUniqueBankAccountNumber(client: DbClient = prisma): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const accountNumber = generateBankAccountNumber();
    const [bankHit, jointHit] = await Promise.all([
      client.bankAccount.findUnique({ where: { accountNumber }, select: { id: true } }),
      client.jointAccount.findUnique({ where: { accountNumber }, select: { id: true } }),
    ]);
    if (!bankHit && !jointHit) return accountNumber;
  }
  throw new Error("Could not allocate a unique account number");
}

export { allocateUniqueBankAccountNumber };

/** Primary checking = main balance account (single account number per user). */
export async function findPrimaryCheckingAccount(
  userId: string,
  client: DbClient = prisma
) {
  return client.bankAccount.findFirst({
    where: { userId, type: "checking" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, accountNumber: true, balance: true, currency: true },
  });
}

export async function getUserAccountNumber(
  userId: string,
  client: DbClient = prisma
): Promise<string | null> {
  const primary = await findPrimaryCheckingAccount(userId, client);
  return primary?.accountNumber ?? null;
}

/** Assign one account number to primary checking only; clear numbers on other accounts. */
export async function ensureUserPrimaryAccountNumber(
  userId: string,
  client: DbClient = prisma
): Promise<string | null> {
  const caps = await getDbSchemaCapabilities();
  if (!caps.bankAccountNumbers) return null;

  const primary = await findPrimaryCheckingAccount(userId, client);
  if (!primary) return null;

  const allAccounts = await client.bankAccount.findMany({
    where: { userId },
    select: { id: true, accountNumber: true, type: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let accountNumber = primary.accountNumber;

  if (!accountNumber) {
    const existingOnOther = allAccounts.find((a) => a.accountNumber);
    accountNumber = existingOnOther?.accountNumber ?? (await allocateUniqueBankAccountNumber(client));
  }

  // Only write when the primary number is missing or wrong — avoids lock contention
  // from preferences/transfers calling this on every request.
  if (primary.accountNumber !== accountNumber) {
    await client.bankAccount.update({
      where: { id: primary.id },
      data: { accountNumber },
    });
  }

  const othersWithNumbers = allAccounts.filter((a) => a.id !== primary!.id && a.accountNumber);
  for (const account of othersWithNumbers) {
    await client.bankAccount.update({
      where: { id: account.id },
      data: { accountNumber: null },
    });
  }

  return accountNumber;
}

/** @deprecated Use ensureUserPrimaryAccountNumber */
export async function ensureBankAccountNumber(
  accountId: string,
  client: DbClient = prisma
): Promise<string> {
  const account = await client.bankAccount.findUnique({
    where: { id: accountId },
    select: { id: true, userId: true, type: true, accountNumber: true },
  });
  if (!account) throw new Error("Account not found");

  const number = await ensureUserPrimaryAccountNumber(account.userId, client);
  if (!number) throw new Error("Could not assign account number");

  if (account.id !== (await findPrimaryCheckingAccount(account.userId, client))?.id) {
    return number;
  }
  return number;
}

/** Ensures each user has exactly one number on their primary checking account. */
export async function ensureUserBankAccountNumbers(
  userId: string,
  client: DbClient = prisma
): Promise<void> {
  await ensureUserPrimaryAccountNumber(userId, client);
}

export async function findBankAccountByUserAccountNumber(
  accountNumber: string,
  client: DbClient = prisma
) {
  const normalized = normalizeBankAccountNumber(accountNumber);
  const resolved = await resolveActiveMemberByAccountNumber(normalized, client);
  if (!resolved) return null;

  return {
    match: resolved.primaryChecking,
    primary: resolved.primaryChecking,
    userId: resolved.user.id,
  };
}

/** Member transfers resolve only through a user's single primary checking number. */
export async function resolveActiveMemberByAccountNumber(
  accountNumberRaw: string,
  client: DbClient = prisma
) {
  const accountNumber = normalizeBankAccountNumber(accountNumberRaw);
  if (!isValidBankAccountNumber(accountNumber)) return null;

  const row = await client.bankAccount.findUnique({
    where: { accountNumber },
    select: { id: true, userId: true, name: true, type: true, accountNumber: true, balance: true, currency: true },
  });
  if (!row?.accountNumber) return null;

  const primary = await findPrimaryCheckingAccount(row.userId, client);
  if (!primary?.accountNumber || primary.id !== row.id || primary.accountNumber !== accountNumber) {
    return null;
  }

  const user = await client.user.findUnique({
    where: { id: row.userId },
    select: { id: true, name: true, role: true, status: true, verificationBadge: true },
  });
  if (!user || user.role !== "USER" || user.status !== "ACTIVE") return null;

  return { user, accountNumber, primaryChecking: primary };
}
