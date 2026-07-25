import type { WithdrawalScriptPhase, WithdrawalRequestStatus } from "@prisma/client";

export type WithdrawalScriptStageAction = "navigate" | "aml-modal" | "none";

export type WithdrawalScriptStage = {
  label: string;
  /** UI tone for history badge */
  tone: "brand" | "amber" | "green" | "red" | "muted";
  action: WithdrawalScriptStageAction;
  resumeUrl: string | null;
  /** User can tap history row to resume */
  clickable: boolean;
};

type ResumeInput = {
  userStep: number;
  withdrawal: {
    id: string;
    status: WithdrawalRequestStatus;
    scriptPhase: WithdrawalScriptPhase;
    chargePayment?: { status: string } | null;
    imfClearancePayment?: { status: string } | null;
  };
  accountFrozen?: boolean;
};

function payChargeUrl(id: string) {
  return `/dashboard/withdrawals/${id}/pay-charge`;
}

function payChargePaymentUrl(id: string) {
  return `/dashboard/withdrawals/${id}/pay-charge/payment`;
}

export function resolveWithdrawalScriptStage(input: ResumeInput): WithdrawalScriptStage {
  const { userStep, withdrawal, accountFrozen } = input;
  const { id, status, scriptPhase } = withdrawal;
  const charge = withdrawal.chargePayment?.status;
  const imf = withdrawal.imfClearancePayment?.status;

  const navigate = (label: string, url: string, tone: WithdrawalScriptStage["tone"] = "brand"): WithdrawalScriptStage => ({
    label,
    tone,
    action: "navigate",
    resumeUrl: url,
    clickable: true,
  });

  if (scriptPhase === "PENDING_TIMER") {
    if (userStep === 1) {
      return navigate("Processing network fee", payChargeUrl(id), "amber");
    }
    if (userStep === 3 && imf === "PAID") {
      return navigate("Sending to receiving bank", `/dashboard/withdrawals/${id}/script/pending`, "amber");
    }
    return navigate("Confirming with bank", `/dashboard/withdrawals/${id}/script/pending`, "amber");
  }

  if (scriptPhase === "BANK_REJECTED") {
    return navigate("Transfer rejected", `/dashboard/withdrawals/${id}/script/bank-rejected`, "red");
  }

  if (scriptPhase === "AWAITING_IMF_CLEARANCE") {
    if (imf === "UNPAID" || imf === "REJECTED") {
      return navigate("Pay clearance fee", `/dashboard/withdrawals/${id}/imf-clearance/pay`, "brand");
    }
    return navigate("Clearance fee due", `/dashboard/withdrawals/${id}/script/imf-clearance`, "brand");
  }

  if (scriptPhase === "IMF_PENDING_VERIFICATION") {
    return {
      label: "Clearance fee verifying",
      tone: "amber",
      action: "navigate",
      resumeUrl: `/dashboard/withdrawals/${id}/script/imf-clearance`,
      clickable: true,
    };
  }

  if (status === "AWAITING_CHARGE_PAYMENT") {
    if (charge === "UNPAID" || charge === "REJECTED") {
      if (userStep === 0 || userStep === 1 || userStep === 3) {
        return navigate("Pay network fee", payChargePaymentUrl(id), "brand");
      }
      return navigate("Pay network fee", payChargeUrl(id), "brand");
    }
    if (charge === "PENDING_VERIFICATION") {
      return navigate("Fee payment verifying", payChargeUrl(id), "amber");
    }
    if (charge === "PAID" && userStep === 1) {
      return navigate("Processing network fee", payChargeUrl(id), "amber");
    }
  }

  if (userStep === 2 && accountFrozen && scriptPhase === "SCRIPT_COMPLETE" && status === "REJECTED") {
    return {
      label: "Account verification required",
      tone: "amber",
      action: "aml-modal",
      resumeUrl: null,
      clickable: true,
    };
  }

  if (scriptPhase !== "NONE" && scriptPhase !== "SCRIPT_COMPLETE") {
    return {
      label: "Withdrawal in progress",
      tone: "amber",
      action: "navigate",
      resumeUrl: payChargeUrl(id),
      clickable: true,
    };
  }

  return {
    label: "",
    tone: "muted",
    action: "none",
    resumeUrl: null,
    clickable: false,
  };
}

export function isWithdrawalScriptStageActive(stage: WithdrawalScriptStage | null | undefined) {
  return !!stage && stage.label.length > 0;
}
