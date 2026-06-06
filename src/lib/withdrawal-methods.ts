import type { WithdrawalMethod } from "@prisma/client";

export type WithdrawalMethodId = WithdrawalMethod;

export type WithdrawalIconKey =
  | "ach"
  | "wire"
  | "zelle"
  | "paypal"
  | "venmo"
  | "cashapp"
  | "applepay"
  | "googlepay"
  | "debitcard"
  | "stablecoin"
  | "check";

export type WithdrawalMethodDef = {
  id: WithdrawalMethodId;
  category: string;
  label: string;
  timing: string;
  fee?: string;
  iconKey: WithdrawalIconKey;
  destinationLabel: string;
  destinationPlaceholder: string;
  extraLabel?: string;
  extraPlaceholder?: string;
  hint?: string;
};

export const WITHDRAWAL_CATEGORIES = [
  "Bank Transfers",
  "Digital Wallets",
  "Cards",
  "Crypto",
  "Checks",
] as const;

export const WITHDRAWAL_METHODS: WithdrawalMethodDef[] = [
  {
    id: "ACH",
    category: "Bank Transfers",
    label: "ACH Transfer",
    timing: "Standard · 1–3 business days",
    iconKey: "ach",
    destinationLabel: "Account number",
    destinationPlaceholder: "Enter your bank account number",
    extraLabel: "Routing number",
    extraPlaceholder: "9-digit ABA routing number",
  },
  {
    id: "WIRE",
    category: "Bank Transfers",
    label: "Wire Transfer",
    timing: "Same day · fee applies",
    fee: "Fee applies",
    iconKey: "wire",
    destinationLabel: "Account number",
    destinationPlaceholder: "Beneficiary account number",
    extraLabel: "Wire details (routing, bank name, SWIFT)",
    extraPlaceholder: "Routing / bank name / SWIFT if international",
  },
  {
    id: "ZELLE",
    category: "Bank Transfers",
    label: "Zelle",
    timing: "Instant · US banks",
    iconKey: "zelle",
    destinationLabel: "Zelle email or phone",
    destinationPlaceholder: "you@email.com or +1 (555) 000-0000",
    hint: "Must match the Zelle profile at your US bank.",
  },
  {
    id: "PAYPAL",
    category: "Digital Wallets",
    label: "PayPal",
    timing: "Email-based payout",
    iconKey: "paypal",
    destinationLabel: "PayPal email",
    destinationPlaceholder: "paypal@email.com",
  },
  {
    id: "VENMO",
    category: "Digital Wallets",
    label: "Venmo",
    timing: "Username-based",
    iconKey: "venmo",
    destinationLabel: "Venmo username",
    destinationPlaceholder: "@yourusername",
  },
  {
    id: "CASH_APP",
    category: "Digital Wallets",
    label: "Cash App",
    timing: "$Cashtag payout",
    iconKey: "cashapp",
    destinationLabel: "Cash App $Cashtag",
    destinationPlaceholder: "$YourCashtag",
  },
  {
    id: "APPLE_PAY",
    category: "Digital Wallets",
    label: "Apple Pay",
    timing: "Routes via linked bank",
    iconKey: "applepay",
    destinationLabel: "Apple Pay email or phone",
    destinationPlaceholder: "Apple ID email or phone on file",
  },
  {
    id: "GOOGLE_PAY",
    category: "Digital Wallets",
    label: "Google Pay",
    timing: "Routes via linked bank",
    iconKey: "googlepay",
    destinationLabel: "Google Pay email or phone",
    destinationPlaceholder: "Gmail or phone linked to Google Pay",
  },
  {
    id: "DEBIT_CARD",
    category: "Cards",
    label: "Debit Card",
    timing: "Visa/Mastercard · instant push-to-card",
    iconKey: "debitcard",
    destinationLabel: "Debit card number",
    destinationPlaceholder: "4111 1111 1111 1111",
    extraLabel: "Name on card",
    extraPlaceholder: "As printed on card",
    hint: "Visa and Mastercard debit only. Funds push instantly after approval.",
  },
  {
    id: "CRYPTO_STABLECOIN",
    category: "Crypto",
    label: "USDC / USDT",
    timing: "Payout to external wallet",
    iconKey: "stablecoin",
    destinationLabel: "Wallet address",
    destinationPlaceholder: "0x… or T… (USDC / USDT)",
    extraLabel: "Network (optional)",
    extraPlaceholder: "e.g. Ethereum, Tron, Polygon",
    hint: "Double-check address and network — crypto transfers cannot be reversed.",
  },
  {
    id: "PAPER_CHECK",
    category: "Checks",
    label: "Paper Check",
    timing: "Mailed · 5–7 business days",
    iconKey: "check",
    destinationLabel: "Payee name",
    destinationPlaceholder: "Full name on check",
    extraLabel: "Mailing address",
    extraPlaceholder: "Street, city, state, ZIP",
  },
];

export function getWithdrawalMethod(id: WithdrawalMethodId | string) {
  return WITHDRAWAL_METHODS.find((m) => m.id === id);
}

export function getWithdrawalMethodLabel(id: WithdrawalMethodId | string) {
  return getWithdrawalMethod(id)?.label ?? id;
}
