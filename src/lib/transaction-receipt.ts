export function formatReferenceId(id: string): string {
  return `#${id.slice(-8).toUpperCase()}`;
}

export function maskDestination(value: string, visible = 6): string {
  if (value.length <= visible * 2) return value;
  return `${value.slice(0, visible)}···${value.slice(-visible)}`;
}

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRANSFER: "Transfer",
  PAYMENT: "Payment",
  INVESTMENT: "Buy Order",
  SALE: "Sell Order",
  PROFIT_CREDIT: "Profit Credit",
  PROFIT_DEBIT: "Profit Debit",
};

export function transactionTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export function buildReceiptDownloadText(data: {
  title: string;
  referenceId: string;
  status: string;
  amount: string;
  destination?: string;
  destinationExtra?: string | null;
  paymentMethod?: string;
  dateTime: string;
  estimatedTime?: string;
  confirmationMessage: string;
  brandName?: string;
}): string {
  const lines = [
    data.brandName ?? "Blackrock Reserve",
    "─".repeat(40),
    data.title,
    "",
    `Reference:     ${data.referenceId}`,
    `Status:        ${data.status}`,
    `Amount:        ${data.amount}`,
    ...(data.paymentMethod ? [`Method:        ${data.paymentMethod}`] : []),
    ...(data.destination ? [`Destination:   ${data.destination}`] : []),
    ...(data.destinationExtra ? [`Details:       ${data.destinationExtra}`] : []),
    `Date & Time:   ${data.dateTime}`,
    ...(data.estimatedTime ? [`Est. Processing: ${data.estimatedTime}`] : []),
    "",
    data.confirmationMessage,
    "",
    "This is an electronic receipt. Keep for your records.",
  ];
  return lines.join("\n");
}

export function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
