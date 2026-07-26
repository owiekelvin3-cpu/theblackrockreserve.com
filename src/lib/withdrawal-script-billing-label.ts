import type { WithdrawalScriptPhase } from "@prisma/client";

/** Short label for the 3-fee billing cycle on the active history row. */
export function getScriptBillingStageLabel(userStep: number, scriptPhase: WithdrawalScriptPhase | string): string | null {
  if (scriptPhase === "AWAITING_IMF_CLEARANCE" || scriptPhase === "IMF_PENDING_VERIFICATION") {
    return "Billing · Stage 3 of 3 (clearance)";
  }
  if (userStep === 0 || scriptPhase === "PENDING_TIMER") {
    return "Billing · Stage 1 of 3 (network fee)";
  }
  if (userStep === 1 || scriptPhase === "BANK_REJECTED") {
    return "Billing · Stage 2 of 3 (network fee)";
  }
  if (userStep === 2 || scriptPhase === "SCRIPT_COMPLETE") {
    return "Billing · verification hold";
  }
  if (userStep === 3) {
    return "Billing · Stage 3 of 3";
  }
  return null;
}
