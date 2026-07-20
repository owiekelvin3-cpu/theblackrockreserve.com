import { prisma } from "@/lib/prisma";
import { getPendingFundReleaseCount } from "@/lib/account-freeze";

/** SQL fragment — registered customers with verified email (excludes admin & incomplete signups) */
const VC = `role = 'USER' AND "emailVerified" IS NOT NULL`;

async function countUnreadSupportChats(): Promise<number> {
  try {
    return await prisma.supportConversation.count({ where: { adminUnread: true } });
  } catch (error) {
    console.error("SupportConversation count unavailable:", error);
    return 0;
  }
}

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
  contactMessages: number;
  unreadSupportChats: number;
};

export type AdminAlertCounts = {
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingKyc: number;
  contactMessages: number;
  unreadSupportChats: number;
  pendingTransactions: number;
  pendingTaxVerifications: number;
  pendingLoans: number;
  pendingCardRequests: number;
  pendingFundReleaseRequests: number;
  pendingWithdrawalCharges: number;
  pendingProfitTaxPayments: number;
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
      (SELECT COUNT(*)::int FROM "WithdrawalRequest" wr INNER JOIN "User" u ON wr."userId" = u.id WHERE u.${VC} AND (
        wr.status = 'PENDING'
        OR EXISTS (
          SELECT 1 FROM "WithdrawalChargePayment" cp
          WHERE cp."withdrawalRequestId" = wr.id AND cp.status = 'PENDING_VERIFICATION'
        )
      )) AS "pendingWithdrawals",
      (SELECT COUNT(*)::int FROM "WithdrawalRequest" wr INNER JOIN "User" u ON wr."userId" = u.id WHERE u.${VC}) AS "totalWithdrawalRequests",
      (SELECT COUNT(*)::int FROM "Transaction" t INNER JOIN "User" u ON t."userId" = u.id WHERE t.type = 'WITHDRAWAL' AND u.${VC}) AS "withdrawalCount",
      (SELECT COUNT(*)::int FROM "Transaction" t INNER JOIN "User" u ON t."userId" = u.id WHERE t.type = 'DEPOSIT' AND u.${VC}) AS "depositTxCount",
      (SELECT COUNT(*)::int FROM "ContactMessage") AS "contactMessages"
  `);
  return { ...row, unreadSupportChats: await countUnreadSupportChats() };
}

/** One round-trip for sidebar / notification badge counts */
export async function getAdminAlertCounts(): Promise<AdminAlertCounts> {
  const [row] = await prisma.$queryRawUnsafe<
    Omit<AdminAlertCounts, "unreadSupportChats" | "pendingFundReleaseRequests">[]
  >(`
    SELECT
      (SELECT COUNT(*)::int FROM "DepositRequest" dr INNER JOIN "User" u ON dr."userId" = u.id WHERE dr.status = 'PENDING' AND u.${VC}) AS "pendingDeposits",
      (SELECT COUNT(*)::int FROM "WithdrawalRequest" wr INNER JOIN "User" u ON wr."userId" = u.id WHERE u.${VC} AND (
        wr.status = 'PENDING'
        OR EXISTS (
          SELECT 1 FROM "WithdrawalChargePayment" cp
          WHERE cp."withdrawalRequestId" = wr.id AND cp.status = 'PENDING_VERIFICATION'
        )
      )) AS "pendingWithdrawals",
      (SELECT COUNT(*)::int FROM "User" WHERE ${VC} AND "kycStatus" IN ('PENDING', 'SUBMITTED')) AS "pendingKyc",
      (SELECT COUNT(*)::int FROM "ContactMessage") AS "contactMessages",
      (SELECT COUNT(*)::int FROM "Transaction" t INNER JOIN "User" u ON t."userId" = u.id WHERE t.status = 'PENDING' AND u.${VC}) AS "pendingTransactions",
      (SELECT COUNT(*)::int FROM "TaxRefundVerification" tr INNER JOIN "User" u ON tr."userId" = u.id WHERE tr.status IN ('PENDING', 'DOCUMENTS_REQUESTED') AND u.${VC}) AS "pendingTaxVerifications",
      (SELECT COUNT(*)::int FROM "LoanApplication" la INNER JOIN "User" u ON la."userId" = u.id WHERE la.status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED') AND u.${VC}) AS "pendingLoans",
      (SELECT COUNT(*)::int FROM "CardRequest" cr INNER JOIN "User" u ON cr."userId" = u.id WHERE cr.status IN ('PENDING_REVIEW', 'UNDER_VERIFICATION') AND u.${VC}) AS "pendingCardRequests",
      (SELECT COUNT(*)::int FROM "WithdrawalChargePayment" cp INNER JOIN "User" u ON cp."userId" = u.id WHERE cp.status = 'PENDING_VERIFICATION' AND u.${VC}) AS "pendingWithdrawalCharges",
      (SELECT COUNT(*)::int FROM "ProfitTaxPayment" ptp INNER JOIN "User" u ON ptp."userId" = u.id WHERE ptp.status = 'PENDING_VERIFICATION' AND u.${VC}) AS "pendingProfitTaxPayments"
  `);
  return {
    ...row,
    unreadSupportChats: await countUnreadSupportChats(),
    pendingFundReleaseRequests: await getPendingFundReleaseCount(),
  };
}
