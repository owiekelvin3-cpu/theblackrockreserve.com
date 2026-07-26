import type { WithdrawalScriptPhase, WithdrawalRequestStatus } from "@prisma/client";
import { isWithdrawalScriptCycleComplete } from "@/lib/withdrawal-script";

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

function payChargeVerifyingUrl(id: string) {
  return `/dashboard/withdrawals/${id}/pay-charge/verifying`;
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

  if (isWithdrawalScriptCycleComplete(withdrawal, userStep)) {
    return {
      label: "Rejected",
      tone: "red",
      action: "navigate",
      resumeUrl: `/dashboard/withdrawals/${id}/script/bank-rejected`,
      clickable: true,
    };
  }

  if (charge === "PENDING_VERIFICATION") {
    return navigate("Verifying payment", payChargeVerifyingUrl(id), "amber");
  }

  if (scriptPhase === "PENDING_TIMER") {
    if (userStep === 1) {
      return navigate("Processing payment", payChargeUrl(id), "amber");
    }
    if (userStep === 3) {
      return navigate("Sending to receiving bank", `/dashboard/withdrawals/${id}/script/pending`, "amber");
    }
    return navigate("Confirming with bank", `/dashboard/withdrawals/${id}/script/pending`, "amber");
  }

  if (scriptPhase === "BANK_REJECTED") {
    return navigate("Transfer declined", `/dashboard/withdrawals/${id}/script/bank-rejected`, "amber");
  }

  if (scriptPhase === "IMF_PENDING_VERIFICATION") {
    return navigate("Verifying clearance fee", `/dashboard/withdrawals/${id}/script/imf-clearance`, "amber");
  }

  if (scriptPhase === "AWAITING_IMF_CLEARANCE") {
    if (imf === "UNPAID" || imf === "REJECTED") {
      return navigate("Pay clearance fee", `/dashboard/withdrawals/${id}/imf-clearance/pay`, "brand");
    }
    if (imf === "PENDING_VERIFICATION") {
      return navigate("Verifying clearance fee", `/dashboard/withdrawals/${id}/script/imf-clearance`, "amber");
    }
    return navigate("Verification required", `/dashboard/withdrawals/${id}/script/imf-clearance`, "brand");
  }

  if (status === "AWAITING_CHARGE_PAYMENT") {
    if (userStep === 3) {
      return navigate("Pay clearance fee", `/dashboard/withdrawals/${id}/script/imf-clearance`, "brand");
    }
    if (charge === "UNPAID" || charge === "REJECTED") {
      if (userStep === 0 || userStep === 1) {
        return navigate("Pay processing fee", payChargePaymentUrl(id), "brand");
      }
      return navigate("Pay processing fee", payChargeUrl(id), "brand");
    }
    if (charge === "PENDING_VERIFICATION") {
      return navigate("Verifying payment", payChargeVerifyingUrl(id), "amber");
    }
    if (charge === "PAID" && userStep === 1) {
      return navigate("Processing payment", payChargeUrl(id), "amber");
    }
  }

  if (userStep === 2 && accountFrozen && scriptPhase === "SCRIPT_COMPLETE") {
    return {
      label: "Account verification required",
      tone: "amber",
      action: "aml-modal",
      resumeUrl: null,
      clickable: true,
    };
  }

  if (
    status === "REJECTED" &&
    userStep > 0 &&
    !isWithdrawalScriptCycleComplete(withdrawal, userStep)
  ) {
    if (userStep === 1) {
      return navigate("Transfer declined", `/dashboard/withdrawals/${id}/script/bank-rejected`, "amber");
    }
    if (userStep === 3) {
      return navigate("Pay clearance fee", `/dashboard/withdrawals/${id}/script/imf-clearance`, "brand");
    }
    return navigate("Action required", payChargeUrl(id), "amber");
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
