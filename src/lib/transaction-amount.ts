import type { TransactionType } from "@prisma/client";

const INCOMING_TRANSFER_RE = /^(member transfer from|deposit from)\b/i;

/** Signed amount for UI: credits positive, debits negative. */
export function getSignedTransactionAmount(
  type: TransactionType | string,
  amount: number | { toString(): string },
  description?: string | null
): number {
  const value = Math.abs(Number(amount));

  if (type === "DEPOSIT" || type === "PROFIT_CREDIT" || type === "SALE") {
    return value;
  }

  if (type === "TRANSFER" && description && INCOMING_TRANSFER_RE.test(description.trim())) {
    return value;
  }

  return -value;
}
