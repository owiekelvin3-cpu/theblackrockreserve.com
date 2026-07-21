/** Flat admin console pages for global search navigation. */
export const ADMIN_NAV_PAGES = [
  { href: "/admin", labelKey: "admin.dashboard", exact: true },
  { href: "/admin/users", labelKey: "admin.users" },
  { href: "/admin/email-center", labelKey: "admin.emailCenter" },
  { href: "/admin/frozen-accounts", labelKey: "admin.accountControls" },
  { href: "/admin/verification-badges", labelKey: "admin.verificationBadges" },
  { href: "/admin/deposits", labelKey: "admin.deposits" },
  { href: "/admin/withdrawals", labelKey: "admin.withdrawals" },
  { href: "/admin/withdrawal-charges", labelKey: "admin.withdrawalCharges" },
  { href: "/admin/profit-tax", labelKey: "admin.profitTax" },
  { href: "/admin/accounts", labelKey: "admin.accounts" },
  { href: "/admin/transactions", labelKey: "admin.transactions" },
  { href: "/admin/balance-adjustments", labelKey: "admin.adjustments" },
  { href: "/admin/profit-management", labelKey: "admin.profit" },
  { href: "/admin/market-assets", labelKey: "admin.marketAssets" },
  { href: "/admin/investments", labelKey: "admin.investments" },
  { href: "/admin/kyc", labelKey: "admin.kycReview" },
  { href: "/admin/card-requests", labelKey: "admin.cardRequests" },
  { href: "/admin/tax-verifications", labelKey: "admin.taxVerification" },
  { href: "/admin/loans", labelKey: "admin.loanManagement" },
  { href: "/admin/messages", labelKey: "admin.messages" },
  { href: "/admin/settings", labelKey: "admin.settings" },
] as const;

export type AdminNavPage = (typeof ADMIN_NAV_PAGES)[number];
