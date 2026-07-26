"use client";

import { Check, Circle, Hourglass, X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import type { ChargeTimelineBankOutcome } from "@/lib/withdrawal-charge-timeline";

type StepState = "completed" | "in_progress" | "pending" | "failed";

function resolveSteps(
  chargeStatus: string | null | undefined,
  bankOutcome: ChargeTimelineBankOutcome
): StepState[] {
  const bankStep = (defaultState: StepState): StepState => {
    if (bankOutcome === "declined" || bankOutcome === "restricted") return "failed";
    return defaultState;
  };

  if (chargeStatus === "PAID") {
    return ["completed", "completed", bankStep("completed")];
  }
  if (chargeStatus === "PENDING_VERIFICATION") {
    return ["completed", "completed", bankStep("in_progress")];
  }
  return ["completed", "in_progress", bankStep("pending")];
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "completed") {
    return (
      <span className="wc-status-icon wc-status-icon-done">
        <Check size={14} strokeWidth={2.5} />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="wc-status-icon wc-status-icon-failed">
        <X size={14} strokeWidth={2.5} />
      </span>
    );
  }
  if (state === "in_progress") {
    return (
      <span className="wc-status-icon wc-status-icon-active">
        <Hourglass size={13} className="wc-status-hourglass" />
      </span>
    );
  }
  return (
    <span className="wc-status-icon wc-status-icon-pending">
      <Circle size={12} strokeWidth={2} />
    </span>
  );
}

export default function WithdrawalChargeStatusTimeline({
  chargeStatus,
  bankOutcome = "normal",
  className,
}: {
  chargeStatus?: string | null;
  bankOutcome?: ChargeTimelineBankOutcome;
  className?: string;
}) {
  const { t } = useI18n();
  const states = resolveSteps(chargeStatus, bankOutcome);

  const bankTitle =
    bankOutcome === "declined"
      ? t("withdrawals.chargePay.statusBankDeclinedTitle")
      : bankOutcome === "restricted"
        ? t("withdrawals.chargePay.statusBankRestrictedTitle")
        : t("withdrawals.chargePay.statusBankTitle");

  const bankStatusLabel =
    states[2] === "failed"
      ? bankOutcome === "restricted"
        ? t("withdrawals.chargePay.statusRestricted")
        : t("withdrawals.chargePay.statusDeclined")
      : states[2] === "completed"
        ? t("withdrawals.chargePay.statusCompleted")
        : states[2] === "in_progress"
          ? t("withdrawals.chargePay.statusInProgress")
          : t("withdrawals.chargePay.statusPending");

  const steps = [
    {
      title: t("withdrawals.chargePay.statusFundsTitle"),
      statusLabel: t("withdrawals.chargePay.statusCompleted"),
      state: states[0],
    },
    {
      title: t("withdrawals.chargePay.statusFeeTitle"),
      statusLabel:
        states[1] === "completed"
          ? t("withdrawals.chargePay.statusCompleted")
          : t("withdrawals.chargePay.statusInProgress"),
      state: states[1],
    },
    {
      title: bankTitle,
      statusLabel: bankStatusLabel,
      state: states[2],
    },
  ];

  return (
    <div className={cn("wc-status-timeline", className)} aria-label={t("withdrawals.chargePay.statusTimelineLabel")}>
      {steps.map((step, index) => (
        <motion.div
          key={step.title}
          className={cn(
            "wc-status-row",
            step.state === "completed" && "is-completed",
            step.state === "in_progress" && "is-active",
            step.state === "pending" && "is-pending",
            step.state === "failed" && "is-failed"
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 + index * 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="wc-status-rail" aria-hidden>
            <StepIcon state={step.state} />
            {index < steps.length - 1 && <span className="wc-status-connector" />}
          </div>
          <div className="wc-status-copy min-w-0">
            <p className="wc-status-title">{step.title}</p>
            <p className="wc-status-meta">
              {t("withdrawals.chargePay.statusLabel")}: {step.statusLabel}
              {step.state === "in_progress" ? " " : ""}
              {step.state === "in_progress" && <span className="wc-status-pulse-dot" aria-hidden />}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
