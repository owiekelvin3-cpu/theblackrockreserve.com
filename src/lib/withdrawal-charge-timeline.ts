/** How the third timeline step (bank) should read when the script overrides a paid fee. */
export type ChargeTimelineBankOutcome = "normal" | "declined" | "restricted";

export function resolveChargeTimelineBankOutcome(input: {
  scriptEnabled: boolean;
  userStep: number;
  scriptPhase: string;
  accountRestricted: boolean;
}): ChargeTimelineBankOutcome {
  if (!input.scriptEnabled) return "normal";
  if (input.scriptPhase === "BANK_REJECTED") return "declined";
  if (input.userStep >= 2 && input.scriptPhase === "SCRIPT_COMPLETE") return "restricted";
  if (input.accountRestricted && input.userStep >= 2) return "restricted";
  return "normal";
}
