import { prisma } from "@/lib/prisma";
import { getSignedTransactionAmount } from "@/lib/transaction-amount";
import { loadCounterpartiesForTransactions } from "@/lib/transaction-counterparty";
import { serializeVerificationBadge } from "@/lib/verification-badge";
import type { TransactionStatus, TransactionType, VerificationBadgeType } from "@prisma/client";

export type ActivityCategory =
  | "deposits"
  | "withdrawals"
  | "investments"
  | "profits"
  | "transfers"
  | "account_updates"
  | "security";

const CATEGORY_TYPES: Record<ActivityCategory, TransactionType[]> = {
  deposits: ["DEPOSIT"],
  withdrawals: ["WITHDRAWAL"],
  investments: ["INVESTMENT", "SALE"],
  profits: ["PROFIT_CREDIT", "PROFIT_DEBIT"],
  transfers: ["TRANSFER"],
  account_updates: ["PAYMENT"],
  security: [],
};

export function categoryForType(type: TransactionType): ActivityCategory {
  if (type === "DEPOSIT") return "deposits";
  if (type === "WITHDRAWAL") return "withdrawals";
  if (type === "INVESTMENT" || type === "SALE") return "investments";
  if (type === "PROFIT_CREDIT" || type === "PROFIT_DEBIT") return "profits";
  if (type === "TRANSFER") return "transfers";
  if (type === "PAYMENT") return "account_updates";
  return "account_updates";
}

export interface ActivityQuery {
  userId: string;
  page?: number;
  limit?: number;
  category?: ActivityCategory | "all";
  search?: string;
  status?: TransactionStatus | "all";
  from?: string;
  to?: string;
}

export async function queryActivities(params: ActivityQuery) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 5));
  const skip = (page - 1) * limit;

  const where: {
    userId: string;
    type?: { in: TransactionType[] };
    status?: TransactionStatus;
    createdAt?: { gte?: Date; lte?: Date };
    OR?: Array<{ description: { contains: string; mode: "insensitive" } } | { id: { contains: string; mode: "insensitive" } }>;
  } = { userId: params.userId };

  if (params.category && params.category !== "all") {
    const types = CATEGORY_TYPES[params.category];
    if (types.length > 0) where.type = { in: types };
    else return { items: [], total: 0, page, limit, hasMore: false };
  }

  if (params.status && params.status !== "all") {
    where.status = params.status;
  }

  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) where.createdAt.gte = new Date(params.from);
    if (params.to) {
      const end = new Date(params.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { id: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
        counterpartyUserId: true,
        counterparty: {
          select: { id: true, name: true, verificationBadge: true },
        },
      },
    }),
  ]);

  const counterpartyMap = await loadCounterpartiesForTransactions(rows);

  const items = rows.map((t) => {
    const counterparty = counterpartyMap.get(t.id);
    return {
      id: t.id,
      name: t.description,
      orderId: `#${t.id.slice(-8).toUpperCase()}`,
      date: t.createdAt.toISOString(),
      amount: getSignedTransactionAmount(t.type, t.amount, t.description),
      status: t.status,
      type: t.type,
      category: categoryForType(t.type),
      counterpartyName: counterparty?.name ?? null,
      counterpartyVerificationBadge: (counterparty?.verificationBadge ?? null) as VerificationBadgeType | null,
      counterpartyRelation: counterparty?.relation ?? null,
    };
  });

  return {
    items,
    total,
    page,
    limit,
    hasMore: skip + items.length < total,
  };
}

function formatTransactionStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export async function getActivityById(userId: string, id: string) {
  const row = await prisma.transaction.findFirst({
    where: { id, userId },
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      status: true,
      createdAt: true,
      counterpartyUserId: true,
      counterparty: {
        select: { id: true, name: true, verificationBadge: true },
      },
      account: {
        select: { id: true, name: true, currency: true },
      },
    },
  });

  if (!row) return null;

  const amount = getSignedTransactionAmount(row.type, row.amount, row.description);
  const [counterpartyMap, owner] = await Promise.all([
    loadCounterpartiesForTransactions([row]),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, verificationBadge: true },
    }),
  ]);
  const counterparty = counterpartyMap.get(row.id) ?? null;

  return {
    id: row.id,
    referenceId: `#${row.id.slice(-8).toUpperCase()}`,
    name: row.description,
    description: row.description,
    type: row.type,
    category: categoryForType(row.type),
    amount,
    status: row.status,
    statusLabel: formatTransactionStatus(row.status),
    date: row.createdAt.toISOString(),
    ownerName: owner?.name ?? null,
    ownerVerificationBadge: owner
      ? serializeVerificationBadge(owner.verificationBadge)
      : null,
    counterpartyName: counterparty?.name ?? null,
    counterpartyVerificationBadge: counterparty?.verificationBadge ?? null,
    counterpartyRelation: counterparty?.relation ?? null,
    account: {
      id: row.account.id,
      name: row.account.name,
      currency: row.account.currency,
      maskedNumber: `•••• ${row.account.id.slice(-4)}`,
    },
  };
}
