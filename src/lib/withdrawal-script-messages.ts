import type { WithdrawalMethod } from "@prisma/client";

export type BankRejectFailureVariant = "paypal" | "bank" | "receiving-bank";

export type BankRejectFailureCopy = {
  variant: BankRejectFailureVariant;
  title: string;
  message: string;
  reviewNote: string;
};

export function getBankRejectFailureCopy(method: WithdrawalMethod): BankRejectFailureCopy {
  switch (method) {
    case "PAYPAL":
      return {
        variant: "paypal",
        title: "PayPal could not accept the transaction",
        message: "PayPal could not accept the transaction due to a system error.",
        reviewNote:
          "PayPal could not accept the transaction due to a system error. Try again later or use another payout account.",
      };
    case "VENMO":
    case "CASH_APP":
      return {
        variant: "bank",
        title: "Your bank could not accept the transaction",
        message:
          "Your bank could not accept the transaction due to a system error. Try again later or use another payout account.",
        reviewNote:
          "Your bank could not accept the transaction due to a system error. Try again later or use another payout account.",
      };
    default:
      return {
        variant: "receiving-bank",
        title: "Transfer rejected by receiving bank",
        message:
          "The receiving bank rejected the transfer due to a temporary system error. Try again later or use another payout account.",
        reviewNote:
          "Receiving bank rejected the transfer due to a temporary system error. Try again later or use another payout account.",
      };
  }
}
