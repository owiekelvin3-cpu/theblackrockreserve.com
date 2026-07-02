import { ensureUserBankAccounts } from "@/lib/dashboard-data";
import { getAvailableBalancesMap } from "@/lib/withdrawal-balance";

export type FundSourceAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  availableBalance: number;
};

function accountSortPriority(type: string) {
  if (type === "checking") return 0;
  if (type === "savings") return 1;
  return 2;
}

/** Standard wallet accounts used across dashboard, transfers, and withdrawals. */
export async function getFundSourceAccounts(
  userId: string,
  options?: { includeExtraAccounts?: boolean }
): Promise<FundSourceAccount[]> {
  const accounts = await ensureUserBankAccounts(userId);

  const sorted = [...accounts].sort((a, b) => {
    const byType = accountSortPriority(a.type) - accountSortPriority(b.type);
    if (byType !== 0) return byType;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const includeExtraAccounts = options?.includeExtraAccounts ?? false;
  const visibleAccounts = includeExtraAccounts
    ? sorted
    : sorted.filter((account) => account.type === "checking" || account.type === "savings");

  const sourceAccounts = visibleAccounts.length > 0 ? visibleAccounts : sorted;

  const availableMap = await getAvailableBalancesMap(
    userId,
    sourceAccounts.map((account) => ({ id: account.id, balance: account.balance }))
  );

  return sourceAccounts.map((account) => {
    const balance = Number(account.balance);
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance,
      availableBalance: availableMap[account.id] ?? balance,
    };
  });
}

export async function getCheckingAccountBalance(userId: string): Promise<number> {
  const accounts = await getFundSourceAccounts(userId);
  const checking = accounts.find((account) => account.type === "checking");
  return checking?.balance ?? 0;
}
