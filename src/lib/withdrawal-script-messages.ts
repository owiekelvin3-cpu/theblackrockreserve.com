import type { WithdrawalMethod } from "@prisma/client";

export type BankRejectFailureVariant = "paypal" | "bank" | "receiving-bank";

export type BankRejectFailureCopy = {
  variant: BankRejectFailureVariant;
  title: string;
  message: string;
  reviewNote: string;
};

export type BankTransitCopy = {
  title: string;
  message: string;
  institutionLabel: string;
};

export function getBankTransitCopy(method: WithdrawalMethod): BankTransitCopy {
  switch (method) {
    case "PAYPAL":
      return {
        institutionLabel: "PayPal",
        title: "Your transfer is on its way to PayPal",
        message:
          "We are securely routing your withdrawal to your PayPal account. This usually takes a few moments.",
      };
    case "VENMO":
      return {
        institutionLabel: "Venmo",
        title: "Your transfer is on its way to Venmo",
        message: "Your payout is being sent to your linked Venmo account through our banking partner.",
      };
    case "CASH_APP":
      return {
        institutionLabel: "Cash App",
        title: "Your transfer is on its way to Cash App",
        message: "Your payout is being sent to your Cash App account through our banking partner.",
      };
    case "APPLE_PAY":
      return {
        institutionLabel: "Apple Pay",
        title: "Your transfer is on its way to Apple Pay",
        message: "Your payout is being routed to your Apple Pay receiving account.",
      };
    default:
      return {
        institutionLabel: "Receiving bank",
        title: "Your transfer is on its way to the receiving bank",
        message:
          "We are securely sending your withdrawal to the receiving bank. Please keep this page open while we confirm delivery.",
      };
  }
}

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
    case "CASH_APP":
      return {
        variant: "bank",
        title: "Cash App could not accept the transaction",
        message:
          "Cash App could not accept the transaction due to a system error. Try again later or use another payout account.",
        reviewNote:
          "Cash App could not accept the transaction due to a system error. Try again later or use another payout account.",
      };
    case "VENMO":
      return {
        variant: "bank",
        title: "Your bank could not accept the transaction",
        message:
          "Your bank could not accept the transaction due to a system error. Try again later or use another payout account.",
        reviewNote:
          "Your bank could not accept the transaction due to a system error. Try again later or use another payout account.",
      };
    default:
  }
}
