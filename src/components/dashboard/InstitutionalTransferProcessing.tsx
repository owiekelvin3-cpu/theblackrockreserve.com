"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessingStep = {
  label: string;
  status: "done" | "active" | "pending";
};

function defaultSteps(secondsLeft: number, totalSeconds: number): ProcessingStep[] {
  const elapsed = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  const s1 = elapsed >= 0.08 ? "done" : "active";
  const s2 = elapsed >= 0.45 ? "done" : elapsed >= 0.08 ? "active" : "pending";
  const s3 = elapsed >= 0.92 ? "done" : elapsed >= 0.45 ? "active" : "pending";
  return [
    { label: "Payment authenticated", status: s1 as ProcessingStep["status"] },
    { label: "Treasury & compliance check", status: s2 as ProcessingStep["status"] },
    { label: "Connecting to payout network", status: s3 as ProcessingStep["status"] },
  ];
}

export function InstitutionalTransferProcessing({
  headline = "Processing secure transfer",
  description = "Your request is moving through our settlement layer. This step usually completes in under a minute.",
  secondsLeft,
  totalSeconds,
  completing = false,
  steps,
  referenceId,
  institutionLabel,
}: {
  headline?: string;
  description?: string;
  secondsLeft: number;
  totalSeconds: number;
  completing?: boolean;
  steps?: ProcessingStep[];
  referenceId?: string;
  institutionLabel?: string;
}) {
  const progress =
    totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - secondsLeft / totalSeconds)) : completing ? 1 : 0;
  const stepItems = steps ?? defaultSteps(secondsLeft, totalSeconds);
  const pctLabel = `${Math.round(progress * 100)}%`;

  return (
    <div className="inst-processing">
      <div className="inst-processing-glow" aria-hidden />
      <div className="inst-processing-inner">
        <div className="inst-processing-mark" aria-hidden>
          <svg viewBox="0 0 120 48" className="inst-processing-rail w-full max-w-[200px] mx-auto h-12">
            <motion.circle
              cx="18"
              cy="24"
              r="6"
              className="inst-processing-node"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              cx="60"
              cy="24"
              r="8"
              className="inst-processing-node inst-processing-node-core"
              animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              cx="102"
              cy="24"
              r="6"
              className="inst-processing-node"
              animate={{ opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
            <line x1="24" y1="24" x2="52" y2="24" className="inst-processing-line" />
            <line x1="68" y1="24" x2="96" y2="24" className="inst-processing-line" />
            <motion.circle
              r="3"
              className="inst-processing-packet"
              animate={{ cx: [18, 60, 102], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", times: [0, 0.45, 0.9, 1] }}
              cy="24"
            />
          </svg>
        </div>

        <p className="inst-processing-eyebrow">Settlement in progress</p>
        <h1 className="inst-processing-headline">{headline}</h1>
        {institutionLabel ? (
          <p className="inst-processing-institution">{institutionLabel}</p>
        ) : null}
        <p className="inst-processing-desc">{description}</p>

        <div className="inst-processing-progress-wrap">
          <div className="inst-processing-progress-meta">
            <span className="inst-processing-progress-label">Session progress</span>
            <span className="inst-processing-progress-pct tabular-nums">{pctLabel}</span>
          </div>
          <div className="inst-processing-progress-track">
            <motion.div
              className="inst-processing-progress-fill"
              initial={false}
              animate={{ width: `${Math.max(completing ? 100 : progress * 100, 4)}%` }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        <ul className="inst-processing-steps">
          {stepItems.map((step) => (
            <li
              key={step.label}
              className={cn(
                "inst-processing-step",
                step.status === "done" && "inst-processing-step-done",
                step.status === "active" && "inst-processing-step-active"
              )}
            >
              <span className="inst-processing-step-icon" aria-hidden>
                {step.status === "done" ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : step.status === "active" ? (
                  <Loader2 size={14} className="animate-spin" strokeWidth={2.25} />
                ) : (
                  <span className="inst-processing-step-dot" />
                )}
              </span>
              <span>{step.label}</span>
            </li>
          ))}
        </ul>

        {referenceId ? (
          <p className="inst-processing-ref">
            Reference <span className="font-mono">{referenceId}</span>
          </p>
        ) : null}

        {completing ? (
          <p className="inst-processing-finalizing">
            <Loader2 size={16} className="animate-spin shrink-0" strokeWidth={2} />
            Finalizing secure handoff…
          </p>
        ) : (
          <p className="inst-processing-hint">Please keep this window open until processing completes.</p>
        )}

        <div className="inst-processing-trust">
          <span>
            <Lock size={12} strokeWidth={2} />
            Encrypted session
          </span>
          <span>
            <ShieldCheck size={12} strokeWidth={2} />
            Verified treasury
          </span>
        </div>
      </div>
    </div>
  );
}
