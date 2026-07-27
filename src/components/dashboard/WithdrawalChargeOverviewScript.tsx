"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FrozenAccountModal from "@/components/dashboard/FrozenAccountModal";
import { InstitutionalTransferProcessing } from "@/components/dashboard/InstitutionalTransferProcessing";
import { ScriptCard } from "@/components/dashboard/WithdrawalScriptAnimations";
import type { WithdrawalMethodDef } from "@/lib/withdrawal-methods";

type ScriptState = {
  step: number;
  phase: string;
  pendingSecondsRemaining: number;
  pendingSecondsTotal: number;
  processingOnOverview: boolean;
  restrictionReason: string;
};

export default function WithdrawalChargeOverviewScript({
  withdrawalId,
  script,
  onComplete,
  referenceId,
  payoutMethod,
}: {
  withdrawalId: string;
  script: ScriptState;
  onComplete?: () => void;
  referenceId?: string;
  payoutMethod?: WithdrawalMethodDef;
}) {
  const [secondsLeft, setSecondsLeft] = useState(script.pendingSecondsRemaining || script.pendingSecondsTotal);
  const [completing, setCompleting] = useState(false);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState(script.restrictionReason);

  const active =
    script.processingOnOverview && script.phase === "PENDING_TIMER" && script.step === 1;

  useEffect(() => {
    setSecondsLeft(script.pendingSecondsRemaining || script.pendingSecondsTotal);
  }, [script.pendingSecondsRemaining, script.pendingSecondsTotal]);

  useEffect(() => {
    if (!active) return;

    if (secondsLeft <= 0) {
      if (completing) return;
      setCompleting(true);
      fetch(`/api/dashboard/withdrawals/${withdrawalId}/script`, {
        method: "POST",
        credentials: "include",
      })
        .then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Processing failed");
          if (json.next === "account-restriction" && json.reason) {
            setRestrictionReason(json.reason);
            setRestrictionOpen(true);
            onComplete?.();
            return;
          }
          onComplete?.();
        })
        .catch(() => {
          setCompleting(false);
        });
      return;
    }

    const timer = window.setTimeout(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [active, secondsLeft, completing, withdrawalId, onComplete]);

  if (!active && !restrictionOpen) return null;

  return (
    <>
      <AnimatePresence>
        {active && (
          <motion.div
            key="inst-processing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg mx-auto"
          >
            <ScriptCard className="!p-0 overflow-hidden border-0 shadow-none bg-transparent">
              <InstitutionalTransferProcessing
                headline="Confirming network settlement"
                description="Your processing fee has been verified. We are routing funds through our banking partners before the next step in your withdrawal."
                secondsLeft={secondsLeft}
                totalSeconds={script.pendingSecondsTotal}
                completing={completing}
                referenceId={referenceId}
                institutionLabel={payoutMethod?.label}
                payoutMethod={payoutMethod}
              />
            </ScriptCard>
          </motion.div>
        )}
      </AnimatePresence>

      <FrozenAccountModal
        open={restrictionOpen}
        reason={restrictionReason}
        onClose={() => setRestrictionOpen(false)}
      />
    </>
  );
}
