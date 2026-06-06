/** User notification types that represent money received */
export const PAYMENT_RECEIVED_TYPES = new Set([
  "DEPOSIT_APPROVED",
  "PAYMENT_RECEIVED",
  "TRANSACTION_RECEIVED",
]);

export const ALERT_NOTIFICATION_TYPES = new Set([
  "DEPOSIT_REJECTED",
  "WITHDRAWAL_REJECTED",
]);

/** Customer-facing copy for balance credits — never reference internal staff actions */
export function buildAccountCreditNotification(amountLabel: string, reference?: string) {
  const note = reference?.trim();
  return {
    title: "Funds credited to your account",
    message: note
      ? `A credit of ${amountLabel} has been posted to your account and is now available. Reference: ${note}.`
      : `A credit of ${amountLabel} has been posted to your account and is now available for use.`,
  };
}

/** Customer-facing copy when a verified deposit clears */
export function buildDepositClearedNotification(amountLabel: string) {
  return {
    title: "Deposit confirmed",
    message: `Your deposit of ${amountLabel} has been verified and credited to your account. The funds are now available in your balance.`,
  };
}

export function buildCreditTransactionDescription(reference: string) {
  const note = reference.trim();
  return note ? `Account credit — ${note}` : "Account credit";
}

export function buildDebitTransactionDescription(reference: string) {
  const note = reference.trim();
  return note ? `Account debit — ${note}` : "Account debit";
}

export function getNotificationSoundVariant(type: string): "default" | "success" | "alert" {
  if (ALERT_NOTIFICATION_TYPES.has(type) || type.includes("REJECTED")) return "alert";
  if (PAYMENT_RECEIVED_TYPES.has(type) || type.includes("APPROVED") || type.includes("RECEIVED")) {
    return "success";
  }
  return "default";
}

export function isIncomingPaymentNotification(type: string) {
  return PAYMENT_RECEIVED_TYPES.has(type);
}
