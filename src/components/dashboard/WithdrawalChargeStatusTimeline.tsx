"use client";

import { Check, Circle, Hourglass } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";

type StepState = "completed" | "in_progress" | "pending";

function resolveSteps(chargeStatus: string | null | undefined): StepState[] {
  if (chargeStatus === "PAID") {
    return ["completed", "completed", "completed"];
  }
  if (chargeStatus === "PENDING_VERIFICATION") {
    return ["completed", "completed", "in_progress"];
  }
  // UNPAID, REJECTED, or missing — fee still outstanding
  return ["completed", "in_progress", "pending"];
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "completed") {
    return (
      <span className="wc-status-icon wc-status-icon-done">
        <Check size={14} strokeWidth={2.5} />
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
  className,
}: {
  chargeStatus?: string | null;
  className?: string;
}) {
  const { t } = useI18n();
  const states = resolveSteps(chargeStatus);

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
      title: t("withdrawals.chargePay.statusBankTitle"),
      statusLabel:
        states[2] === "completed"
          ? t("withdrawals.chargePay.statusCompleted")
          : states[2] === "in_progress"
            ? t("withdrawals.chargePay.statusInProgress")
            : t("withdrawals.chargePay.statusPending"),
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
            step.state === "pending" && "is-pending"
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
