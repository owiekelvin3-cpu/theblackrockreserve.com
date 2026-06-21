import { unstable_cache } from "next/cache";
import { formatUserLocation } from "@/lib/geo-location";
import { getInvestedBalance } from "@/lib/user-balances";
import { getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";
import { prisma } from "@/lib/prisma";
import { verifiedCustomerWhere, registeredCustomerWhere } from "@/lib/customer-auth";
import { getAdminStatsCounts, getAdminAlertCounts } from "@/lib/admin-stats";
import { getActiveAccountFreeze, FREEZE_TYPE_LABELS } from "@/lib/account-freeze";

export const ADMIN_OVERVIEW_TAG = "admin-overview";
export const ADMIN_NOTIFICATIONS_TAG = "admin-notifications";

async function loadAdminNotificationCounts() {
  try {
    const [counts, recentDepositAlerts] = await Promise.all([
      getAdminAlertCounts(),
      prisma.depositRequest.findMany({
        where: { status: "PENDING", user: verifiedCustomerWhere },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const {
      pendingDeposits,
      pendingWithdrawals,
      pendingKyc,
      contactMessages,
      unreadSupportChats = 0,
      pendingTransactions,
      pendingTaxVerifications,
      pendingLoans,
      pendingCardRequests = 0,
      pendingFundReleaseRequests = 0,
    } = counts;

    return {
      pendingDeposits,
      pendingWithdrawals,
      pendingKyc,
      contactMessages,
      unreadSupportChats,
      pendingTransactions,
      pendingTaxVerifications,
      pendingLoans,
      pendingCardRequests,
      pendingFundReleaseRequests,
      totalAlerts:
        pendingDeposits +
        pendingWithdrawals +
        pendingKyc +
        pendingTransactions +
        pendingTaxVerifications +
        pendingLoans +
        pendingCardRequests +
        pendingFundReleaseRequests +
        unreadSupportChats,
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
  } catch (error) {
    console.error("Admin notification counts failed:", error);
    return {
      pendingDeposits: 0,
      pendingWithdrawals: 0,
      pendingKyc: 0,
      contactMessages: 0,
      unreadSupportChats: 0,
      pendingTransactions: 0,
      pendingTaxVerifications: 0,
      pendingLoans: 0,
      pendingCardRequests: 0,
      pendingFundReleaseRequests: 0,
      totalAlerts: 0,
      recentDepositAlerts: [],
    };
  }
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

  return {
    stats: {
      totalUsers: stats.totalUsers,
      pendingKyc: stats.pendingKyc,
      totalTransactions: stats.totalTransactions,
      totalAccounts: stats.totalAccounts,
      totalAum: stats.totalAum,
      contactMessages: stats.contactMessages,
      unreadSupportChats: stats.unreadSupportChats,
      pendingDeposits: stats.pendingDeposits,
      totalDepositRequests: stats.totalDepositRequests,
      pendingWithdrawals: stats.pendingWithdrawals,
      totalWithdrawalRequests: stats.totalWithdrawalRequests,
      withdrawalCount: stats.withdrawalCount,
      depositTxCount: stats.depositTxCount,
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
  verificationBadge?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      ...registeredCustomerWhere,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.kycStatus ? { kycStatus: filters.kycStatus as "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED" } : {}),
      ...(filters?.verificationBadge
        ? { verificationBadge: filters.verificationBadge as "NONE" | "STANDARD" | "BUSINESS" | "GOLD" }
        : {}),
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
    verificationBadge: u.verificationBadge,
    verificationBadgeAt: u.verificationBadgeAt?.toISOString() ?? null,
    accountsCount: u._count.accounts,
    transactionsCount: u._count.transactions,
    depositsCount: u._count.depositRequests,
    totalBalance: u.accounts.reduce((s, a) => s + Number(a.balance), 0),
    location: formatUserLocation({ city: u.city, region: u.region, country: u.country }),
    lastLoginIp: u.lastLoginIp,
    lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getAdminUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      verificationBadgeBy: { select: { id: true, name: true, email: true } },
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

  const [investedBalance, activeFreeze] = await Promise.all([
    getInvestedBalance(user.id),
    getActiveAccountFreeze(user.id),
  ]);

  return {
    id: user.id,
    profitBalance: Number(user.profitBalance),
    investedBalance,
    name: user.name,
    email: user.email,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
    accountType: user.accountType,
    status: user.status,
    kycStatus: user.kycStatus,
    emailVerified: !!user.emailVerified,
    verificationBadge: user.verificationBadge,
    verificationBadgeAt: user.verificationBadgeAt?.toISOString() ?? null,
    verificationBadgeBy: user.verificationBadgeBy
      ? { id: user.verificationBadgeBy.id, name: user.verificationBadgeBy.name, email: user.verificationBadgeBy.email }
      : null,
    emailVerifiedAt: user.emailVerified?.toISOString() ?? null,
    hasPassword: Boolean(user.password),
    passwordPlaintext: user.passwordPlaintext,
    kycIdFront: user.kycIdFront,
    kycIdBack: user.kycIdBack,
    updatedAt: user.updatedAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
    location: formatUserLocation({ city: user.city, region: user.region, country: user.country }),
    signupIp: user.signupIp,
    lastLoginIp: user.lastLoginIp,
    country: user.country,
    region: user.region,
    city: user.city,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
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
    accountFreeze: activeFreeze
      ? {
          id: activeFreeze.id,
          freezeType: activeFreeze.freezeType,
          freezeTypeLabel: FREEZE_TYPE_LABELS[activeFreeze.freezeType],
          reason: activeFreeze.reason,
          internalNotes: activeFreeze.internalNotes,
          frozenAt: activeFreeze.frozenAt.toISOString(),
          frozenBy: activeFreeze.frozenBy,
        }
      : null,
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
    proofImage: d.proofImage,
    hasProofImage: Boolean(d.proofImage),
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
      chargePayment: {
        select: {
          id: true,
          status: true,
          amountUsd: true,
          paymentMethod: true,
          txHash: true,
          proofNote: true,
          paidAt: true,
        },
      },
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
      userName: w.userNameSnapshot ?? w.user.name,
      userEmail: w.user.email,
      accountId: w.accountId,
      accountName: account?.name ?? "—",
      accountBalance: account ? Number(account.balance) : null,
      method: w.method,
      methodLabel: getWithdrawalMethodLabel(w.method),
      amountUsd: Number(w.amountUsd),
      assignedChargeAmount: w.assignedChargeAmount != null ? Number(w.assignedChargeAmount) : null,
      chargePaymentStatus: w.chargePayment?.status ?? null,
      chargePaymentId: w.chargePayment?.id ?? null,
      chargePaymentTxHash: w.chargePayment?.txHash ?? null,
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

export async function getAdminWithdrawalCharges() {
  const [charges, users] = await Promise.all([
    prisma.userWithdrawalCharge.findMany({
      where: { user: verifiedCustomerWhere },
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { ...verifiedCustomerWhere, role: "USER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    charges: charges.map((c) => ({
      id: c.id,
      userId: c.userId,
      userName: c.user.name,
      userEmail: c.user.email,
      chargeType: c.chargeType,
      amountUsd: Number(c.amountUsd),
      percentage: c.percentage != null ? Number(c.percentage) : null,
      active: c.active,
      createdByName: c.createdBy.name,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    users,
  };
}

export async function getAdminWithdrawalChargePayments() {
  const payments = await prisma.withdrawalChargePayment.findMany({
    where: { user: verifiedCustomerWhere },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      withdrawalRequest: {
        select: {
          id: true,
          amountUsd: true,
          method: true,
          status: true,
          userNameSnapshot: true,
        },
      },
      reviewer: { select: { name: true } },
    },
  });

  return payments.map((p) => ({
    id: p.id,
    userId: p.userId,
    userName: p.user.name,
    userEmail: p.user.email,
    withdrawalRequestId: p.withdrawalRequestId,
    withdrawalAmount: Number(p.withdrawalRequest.amountUsd),
    withdrawalStatus: p.withdrawalRequest.status,
    withdrawalMethod: getWithdrawalMethodLabel(p.withdrawalRequest.method),
    amountUsd: Number(p.amountUsd),
    paymentMethod: p.paymentMethod,
    status: p.status,
    txHash: p.txHash,
    proofNote: p.proofNote,
    reviewNote: p.reviewNote,
    reviewerName: p.reviewer?.name ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));
}
