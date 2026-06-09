import { prisma } from "@/lib/prisma";

/** SQL fragment — registered customers with verified email (excludes admin & incomplete signups) */
const VC = `role = 'USER' AND "emailVerified" IS NOT NULL`;

export type AdminStatsRow = {
  totalUsers: number;
  pendingKyc: number;
  totalTransactions: number;
  totalAccounts: number;
  totalAum: number;
  pendingDeposits: number;
  totalDepositRequests: number;
  pendingWithdrawals: number;
  totalWithdrawalRequests: number;
  withdrawalCount: number;
  depositTxCount: number;
  auditLogCount: number;
  contactMessages: number;
};

export type AdminAlertCounts = {
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingKyc: number;
  contactMessages: number;
  pendingTransactions: number;
};

/** One round-trip for all admin dashboard counters */
export async function getAdminStatsCounts(): Promise<AdminStatsRow> {
  const [row] = await prisma.$queryRawUnsafe<AdminStatsRow[]>(`
    SELECT
      (SELECT COUNT(*)::int FROM "User" WHERE ${VC}) AS "totalUsers",
      (SELECT COUNT(*)::int FROM "User" WHERE ${VC} AND "kycStatus" IN ('PENDING', 'SUBMITTED')) AS "pendingKyc",
      (SELECT COUNT(*)::int FROM "Transaction" t INNER JOIN "User" u ON t."userId" = u.id WHERE u.${VC}) AS "totalTransactions",
      (SELECT COUNT(*)::int FROM "BankAccount" ba INNER JOIN "User" u ON ba."userId" = u.id WHERE u.${VC}) AS "totalAccounts",
      (SELECT COALESCE(SUM(ba.balance), 0)::float FROM "BankAccount" ba INNER JOIN "User" u ON ba."userId" = u.id WHERE u.${VC}) AS "totalAum",
      (SELECT COUNT(*)::int FROM "DepositRequest" dr INNER JOIN "User" u ON dr."userId" = u.id WHERE dr.status = 'PENDING' AND u.${VC}) AS "pendingDeposits",
      (SELECT COUNT(*)::int FROM "DepositRequest" dr INNER JOIN "User" u ON dr."userId" = u.id WHERE u.${VC}) AS "totalDepositRequests",
      (SELECT COUNT(*)::int FROM "WithdrawalRequest" wr INNER JOIN "User" u ON wr."userId" = u.id WHERE wr.status = 'PENDING' AND u.${VC}) AS "pendingWithdrawals",
      (SELECT COUNT(*)::int FROM "WithdrawalRequest" wr INNER JOIN "User" u ON wr."userId" = u.id WHERE u.${VC}) AS "totalWithdrawalRequests",
      (SELECT COUNT(*)::int FROM "Transaction" t INNER JOIN "User" u ON t."userId" = u.id WHERE t.type = 'WITHDRAWAL' AND u.${VC}) AS "withdrawalCount",
      (SELECT COUNT(*)::int FROM "Transaction" t INNER JOIN "User" u ON t."userId" = u.id WHERE t.type = 'DEPOSIT' AND u.${VC}) AS "depositTxCount",
      (SELECT COUNT(*)::int FROM "AdminActivityLog") AS "auditLogCount",
      (SELECT COUNT(*)::int FROM "ContactMessage") AS "contactMessages"
  `);
  return row;
}

/** One round-trip for sidebar / notification badge counts */
export async function getAdminAlertCounts(): Promise<AdminAlertCounts> {
  const [row] = await prisma.$queryRawUnsafe<AdminAlertCounts[]>(`
    SELECT
      (SELECT COUNT(*)::int FROM "DepositRequest" dr INNER JOIN "User" u ON dr."userId" = u.id WHERE dr.status = 'PENDING' AND u.${VC}) AS "pendingDeposits",
      (SELECT COUNT(*)::int FROM "WithdrawalRequest" wr INNER JOIN "User" u ON wr."userId" = u.id WHERE wr.status = 'PENDING' AND u.${VC}) AS "pendingWithdrawals",
      (SELECT COUNT(*)::int FROM "User" WHERE ${VC} AND "kycStatus" IN ('PENDING', 'SUBMITTED')) AS "pendingKyc",
      (SELECT COUNT(*)::int FROM "ContactMessage") AS "contactMessages",
      (SELECT COUNT(*)::int FROM "Transaction" t INNER JOIN "User" u ON t."userId" = u.id WHERE t.status = 'PENDING' AND u.${VC}) AS "pendingTransactions"
  `);
  return row;
}
