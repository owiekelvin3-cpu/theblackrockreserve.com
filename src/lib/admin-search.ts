import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registeredCustomerWhere, verifiedCustomerWhere } from "@/lib/customer-auth";
import { getAdminLoanApplications, getAdminTaxVerifications } from "@/lib/admin-loan-data";

export type AdminSearchResultType =
  | "user"
  | "deposit"
  | "withdrawal"
  | "transaction"
  | "loan"
  | "tax";

export type AdminSearchResult = {
  id: string;
  type: AdminSearchResultType;
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
};

const PER_TYPE_LIMIT = 5;

function userOrClause(q: string): Prisma.UserWhereInput[] {
  const clauses: Prisma.UserWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
  ];
  if (q.length >= 3) {
    clauses.push({ phone: { contains: q, mode: "insensitive" } });
  }
  if (q.length >= 8) {
    clauses.push({ id: { contains: q, mode: "insensitive" } });
  }
  return clauses;
}

export async function runAdminGlobalSearch(query: string, limit = 20): Promise<AdminSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const take = Math.min(Math.max(Math.ceil(limit / 4), 3), PER_TYPE_LIMIT);

  const [users, deposits, withdrawals, transactions, loans, taxVerifications] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...registeredCustomerWhere,
        OR: userOrClause(q),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        kycStatus: true,
        status: true,
      },
    }),
    prisma.depositRequest.findMany({
      where: {
        user: verifiedCustomerWhere,
        OR: [
          { txHash: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.withdrawalRequest.findMany({
      where: {
        user: verifiedCustomerWhere,
        OR: [
          { destination: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        user: registeredCustomerWhere,
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { id: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    getAdminLoanApplications({ search: q }).then((rows) => rows.slice(0, take)),
    getAdminTaxVerifications({ search: q }).then((rows) => rows.slice(0, take)),
  ]);

  const results: AdminSearchResult[] = [];

  for (const user of users) {
    results.push({
      id: `user-${user.id}`,
      type: "user",
      title: user.name,
      subtitle: user.email,
      href: `/admin/users/${user.id}`,
      meta: `${user.status} · KYC ${user.kycStatus}`,
    });
  }

  for (const deposit of deposits) {
    results.push({
      id: `deposit-${deposit.id}`,
      type: "deposit",
      title: deposit.user.name,
      subtitle: deposit.txHash ?? deposit.user.email,
      href: `/admin/users/${deposit.user.id}`,
      meta: `Deposit · ${deposit.status}${deposit.amountUsd ? ` · $${Number(deposit.amountUsd).toFixed(2)}` : ""}`,
    });
  }

  for (const withdrawal of withdrawals) {
    results.push({
      id: `withdrawal-${withdrawal.id}`,
      type: "withdrawal",
      title: withdrawal.user.name,
      subtitle: withdrawal.destination,
      href: `/admin/users/${withdrawal.user.id}`,
      meta: `Withdrawal · ${withdrawal.status} · $${Number(withdrawal.amountUsd).toFixed(2)}`,
    });
  }

  for (const tx of transactions) {
    results.push({
      id: `transaction-${tx.id}`,
      type: "transaction",
      title: tx.description,
      subtitle: tx.user.name,
      href: `/admin/transactions`,
      meta: `${tx.type} · $${Number(tx.amount).toFixed(2)} · ${tx.status}`,
    });
  }

  for (const loan of loans) {
    results.push({
      id: `loan-${loan.id}`,
      type: "loan",
      title: loan.applicationNumber,
      subtitle: `${loan.userName} · ${loan.productName}`,
      href: `/admin/loans`,
      meta: `${loan.status} · $${loan.requestedAmount.toFixed(2)}`,
    });
  }

  for (const tax of taxVerifications) {
    results.push({
      id: `tax-${tax.id}`,
      type: "tax",
      title: tax.applicationNumber,
      subtitle: tax.fullLegalName,
      href: `/admin/tax-verifications`,
      meta: `${tax.status} · ${tax.userName}`,
    });
  }

  return results.slice(0, limit);
}
