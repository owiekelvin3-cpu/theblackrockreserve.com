import { unstable_cache } from "next/cache";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { prisma } from "@/lib/prisma";
import { verifiedCustomerWhere, registeredCustomerWhere } from "@/lib/customer-auth";
import { getAdminStatsCounts, getAdminAlertCounts } from "@/lib/admin-stats";
import { getAdminAuditLogs } from "@/lib/admin-audit";

export const ADMIN_OVERVIEW_TAG = "admin-overview";
export const ADMIN_NOTIFICATIONS_TAG = "admin-notifications";

async function loadAdminNotificationCounts() {
  const [counts, recentDepositAlerts] = await Promise.all([
    getAdminAlertCounts(),
    prisma.depositRequest.findMany({
      where: { status: "PENDING", user: verifiedCustomerWhere },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const { pendingDeposits, pendingWithdrawals, pendingKyc, contactMessages, pendingTransactions } = counts;

  return {
    pendingDeposits,
    pendingWithdrawals,
    pendingKyc,
    contactMessages,
    pendingTransactions,
    totalAlerts: pendingDeposits + pendingWithdrawals + pendingKyc + pendingTransactions,
    recentDepositAlerts: recentDepositAlerts.map((d) => ({
      id: d.id,
      depositId: d.id,
      userId: d.userId,
      userName: d.user.name,
      userEmail: d.user.email,
      amountUsd: d.amountUsd ? Number(d.amountUsd) : null,
      bitcoinWalletAddress: d.bitcoinWalletAddress,
      txHash: d.txHash,
      status: "Pending Approval",
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

export const getAdminNotificationCounts = unstable_cache(
  loadAdminNotificationCounts,
  ["admin-notification-counts"],
  { revalidate: 20, tags: [ADMIN_NOTIFICATIONS_TAG] }
);

async function loadAdminOverview() {
  const stats = await getAdminStatsCounts();

  const [usersByKyc, txByType, depositsByStatus] = await Promise.all([
    prisma.user.groupBy({
      by: ["kycStatus"],
      where: verifiedCustomerWhere,
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { user: verifiedCustomerWhere },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.depositRequest.groupBy({
      by: ["status"],
      where: { user: verifiedCustomerWhere },
      _count: true,
    }),
  ]);

  const [recentUsers, recentTransactions, pendingKycUsers] = await Promise.all([
    prisma.user.findMany({
      where: verifiedCustomerWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, kycStatus: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { user: verifiedCustomerWhere },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, email: true } }, account: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { ...verifiedCustomerWhere, kycStatus: { in: ["PENDING", "SUBMITTED"] } },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: { id: true, name: true, email: true, kycStatus: true, createdAt: true },
    }),
  ]);

  const recentDeposits = await prisma.depositRequest.findMany({
    where: { user: verifiedCustomerWhere },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const recentAuditLogs = await getAdminAuditLogs(5);

  return {
    stats: {
      totalUsers: stats.totalUsers,
      pendingKyc: stats.pendingKyc,
      totalTransactions: stats.totalTransactions,
      totalAccounts: stats.totalAccounts,
      totalAum: stats.totalAum,
      contactMessages: stats.contactMessages,
      pendingDeposits: stats.pendingDeposits,
      totalDepositRequests: stats.totalDepositRequests,
      pendingWithdrawals: stats.pendingWithdrawals,
      totalWithdrawalRequests: stats.totalWithdrawalRequests,
      withdrawalCount: stats.withdrawalCount,
      depositTxCount: stats.depositTxCount,
      auditLogCount: stats.auditLogCount,
    },
    recentUsers: recentUsers.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      userName: t.user.name,
      userEmail: t.user.email,
      accountName: t.account.name,
    })),
    pendingKycUsers: pendingKycUsers.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    recentDeposits: recentDeposits.map((d) => ({
      id: d.id,
      userId: d.userId,
      userName: d.user.name,
      userEmail: d.user.email,
      amountUsd: d.amountUsd ? Number(d.amountUsd) : null,
      status: d.status,
      txHash: d.txHash,
      createdAt: d.createdAt.toISOString(),
    })),
    recentAuditLogs: recentAuditLogs,
    usersByKyc: usersByKyc.map((g) => ({ status: g.kycStatus, count: g._count })),
    txByType: txByType.map((g) => ({
      type: g.type,
      count: g._count,
      volume: Number(g._sum.amount ?? 0),
    })),
    depositsByStatus: depositsByStatus.map((g) => ({ status: g.status, count: g._count })),
  };
}

export const getAdminOverview = unstable_cache(
  loadAdminOverview,
  ["admin-overview-data"],
  { revalidate: 25, tags: [ADMIN_OVERVIEW_TAG] }
);

export async function getAdminUsers(filters?: {
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
  kycStatus?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      ...registeredCustomerWhere,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.kycStatus ? { kycStatus: filters.kycStatus as "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED" } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { email: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { accounts: true, transactions: true, depositRequests: true } },
      accounts: { select: { balance: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    accountType: u.accountType,
    status: u.status,
    kycStatus: u.kycStatus,
    emailVerified: !!u.emailVerified,
    accountsCount: u._count.accounts,
    transactionsCount: u._count.transactions,
    depositsCount: u._count.depositRequests,
    totalBalance: u.accounts.reduce((s, a) => s + Number(a.balance), 0),
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getAdminUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      accounts: true,
      transactions: { orderBy: { createdAt: "desc" }, take: 10 },
      investments: true,
      depositRequests: { orderBy: { createdAt: "desc" }, take: 10 },
      balanceAdjustments: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          admin: { select: { name: true, email: true } },
          account: { select: { name: true } },
        },
      },
    },
  });

  if (!user || user.role === "ADMIN") return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
    accountType: user.accountType,
    status: user.status,
    kycStatus: user.kycStatus,
    emailVerified: !!user.emailVerified,
    emailVerifiedAt: user.emailVerified?.toISOString() ?? null,
    hasPassword: Boolean(user.password),
    passwordPlaintext: user.passwordPlaintext,
    kycIdFront: user.kycIdFront,
    kycIdBack: user.kycIdBack,
    updatedAt: user.updatedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    accounts: user.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      currency: a.currency,
      balance: Number(a.balance),
    })),
    transactions: user.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    investments: user.investments.map((i) => ({
      id: i.id,
      symbol: i.symbol,
      name: i.name,
      shares: Number(i.shares),
      avgPrice: Number(i.avgPrice),
    })),
    depositRequests: user.depositRequests.map((d) => ({
      id: d.id,
      amountUsd: d.amountUsd ? Number(d.amountUsd) : null,
      status: d.status,
      txHash: d.txHash,
      createdAt: d.createdAt.toISOString(),
    })),
    balanceAdjustments: user.balanceAdjustments.map((a) => ({
      id: a.id,
      type: a.type,
      amount: Number(a.amount),
      reason: a.reason,
      balanceBefore: Number(a.balanceBefore),
      balanceAfter: Number(a.balanceAfter),
      createdAt: a.createdAt.toISOString(),
      adminName: a.admin.name,
      accountName: a.account.name,
    })),
  };
}

export async function updateAdminTransactionStatus(id: string, status: "COMPLETED" | "FAILED") {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return null;

  const updated = await prisma.transaction.update({
    where: { id },
    data: { status },
  });

  return {
    id: updated.id,
    status: updated.status,
    userId: updated.userId,
  };
}

export async function getAdminTransactions(limit = 50) {
  const transactions = await prisma.transaction.findMany({
    where: { user: verifiedCustomerWhere },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      account: { select: { name: true, currency: true } },
    },
  });

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    description: t.description,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    userId: t.user.id,
    userName: t.user.name,
    userEmail: t.user.email,
    accountName: t.account.name,
    currency: t.account.currency,
  }));
}

export async function getAdminKycQueue() {
  const users = await prisma.user.findMany({
    where: { ...verifiedCustomerWhere, kycStatus: { in: ["PENDING", "SUBMITTED", "REJECTED"] } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      kycStatus: true,
      kycIdFront: true,
      kycIdBack: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));
}

export async function getAdminMessages() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return messages.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    subject: m.subject,
    message: m.message,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function deleteAdminMessage(id: string) {
  return prisma.contactMessage.delete({ where: { id } });
}

export async function getAdminAccounts() {
  const accounts = await prisma.bankAccount.findMany({
    where: { user: verifiedCustomerWhere },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, kycStatus: true } } },
  });

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: Number(a.balance),
    createdAt: a.createdAt.toISOString(),
    userId: a.user.id,
    userName: a.user.name,
    userEmail: a.user.email,
    userKyc: a.user.kycStatus,
  }));
}

export async function getAdminDeposits() {
  const deposits = await prisma.depositRequest.findMany({
    where: { user: verifiedCustomerWhere },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
    },
  });

  const accountIds = Array.from(new Set(deposits.map((d) => d.accountId).filter(Boolean))) as string[];
  const accounts = accountIds.length
    ? await prisma.bankAccount.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, name: true, currency: true },
      })
    : [];
  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return deposits.map((d) => ({
    id: d.id,
    userId: d.userId,
    userName: d.user.name,
    userEmail: d.user.email,
    accountId: d.accountId,
    accountName: d.accountId ? accountMap[d.accountId]?.name ?? "Unknown account" : null,
    amountUsd: d.amountUsd ? Number(d.amountUsd) : null,
    bitcoinWalletAddress: d.bitcoinWalletAddress,
    txHash: d.txHash,
    proofNote: d.proofNote,
    status: d.status,
    statusLabel: d.status === "PENDING" ? "Pending Approval" : d.status === "APPROVED" ? "Approved" : "Rejected",
    reviewNote: d.reviewNote,
    reviewerName: d.reviewer?.name,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function getAdminWithdrawals() {
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { user: verifiedCustomerWhere },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
    },
  });

  const accountIds = Array.from(new Set(withdrawals.map((w) => w.accountId)));
  const accounts = accountIds.length
    ? await prisma.bankAccount.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, name: true, balance: true },
      })
    : [];
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return withdrawals.map((w) => {
    const account = accountMap.get(w.accountId);
    return {
      id: w.id,
      userId: w.userId,
      userName: w.user.name,
      userEmail: w.user.email,
      accountId: w.accountId,
      accountName: account?.name ?? "—",
      accountBalance: account ? Number(account.balance) : null,
      method: w.method,
      methodLabel: getWithdrawalMethodLabel(w.method),
      amountUsd: Number(w.amountUsd),
      destination: w.destination,
      destinationExtra: w.destinationExtra,
      note: w.note,
      status: w.status,
      reviewNote: w.reviewNote,
      reviewerName: w.reviewer?.name,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  });
}
