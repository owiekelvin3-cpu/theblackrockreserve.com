import { formatWithdrawalStatus } from "@/lib/withdrawal-charge";
import { getWithdrawalMethod, getWithdrawalMethodLabel } from "@/lib/withdrawal-methods";

export type WithdrawalReceiptData = {
  id: string;
  amountUsd: number;
  method: string;
  methodLabel: string;
  destination: string;
  destinationExtra?: string | null;
  accountName?: string;
  status: string;
  statusLabel: string;
  displayStatus: string;
  currentStatus: string;
  createdAt: string;
  estimatedProcessingTime?: string;
  requiresChargePayment?: boolean;
  chargeAmount?: number | null;
  note?: string | null;
};

function resolveWithdrawalReceiptStatuses(
  status: string,
  assignedChargeAmount?: number | null
): Pick<WithdrawalReceiptData, "displayStatus" | "currentStatus" | "requiresChargePayment"> {
  const chargeDue =
    status === "AWAITING_CHARGE_PAYMENT" &&
    assignedChargeAmount != null &&
    assignedChargeAmount > 0;

  switch (status) {
    case "AWAITING_CHARGE_PAYMENT":
      return {
        displayStatus: "Pending",
        currentStatus: chargeDue ? "Awaiting charge payment" : "Awaiting review",
        requiresChargePayment: chargeDue,
      };
    case "PENDING":
      return {
        displayStatus: "Pending",
        currentStatus: "Awaiting admin review",
        requiresChargePayment: false,
      };
    case "APPROVED":
      return {
        displayStatus: "Completed",
        currentStatus: "Withdrawal approved",
        requiresChargePayment: false,
      };
    case "REJECTED":
      return {
        displayStatus: "Rejected",
        currentStatus: "Withdrawal rejected",
        requiresChargePayment: false,
      };
    default:
      return {
        displayStatus: formatWithdrawalStatus(status),
        currentStatus: formatWithdrawalStatus(status),
        requiresChargePayment: false,
      };
  }
}

export function buildWithdrawalReceiptData(input: {
  id: string;
  amountUsd: number;
  method: string;
  destination: string;
  destinationExtra?: string | null;
  note?: string | null;
  accountName?: string | null;
  status: string;
  createdAt: string | Date;
  assignedChargeAmount?: number | null;
}): WithdrawalReceiptData {
  const methodDef = getWithdrawalMethod(input.method);
  const statusLabel = formatWithdrawalStatus(input.status);
  const createdAt =
    typeof input.createdAt === "string" ? input.createdAt : input.createdAt.toISOString();
  const resolved = resolveWithdrawalReceiptStatuses(input.status, input.assignedChargeAmount);

  return {
    id: input.id,
    amountUsd: input.amountUsd,
    method: input.method,
    methodLabel: getWithdrawalMethodLabel(input.method),
    destination: input.destination,
    destinationExtra: input.destinationExtra?.trim() || null,
    accountName: input.accountName ?? undefined,
    status: input.status,
    statusLabel,
    displayStatus: resolved.displayStatus,
    currentStatus: resolved.currentStatus,
    createdAt,
    estimatedProcessingTime: methodDef?.timing,
    requiresChargePayment: resolved.requiresChargePayment,
    chargeAmount: input.assignedChargeAmount,
    note: input.note?.trim() || null,
  };
}
