"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import FrozenAccountModal from "@/components/dashboard/FrozenAccountModal";
import { PendingTimerRing } from "@/components/dashboard/WithdrawalScriptAnimations";

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
}: {
  withdrawalId: string;
  script: ScriptState;
  onComplete?: () => void;
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-[inherit] bg-bg-primary/92 backdrop-blur-md px-6 py-8 text-center"
          >
            <PendingTimerRing secondsLeft={secondsLeft} totalSeconds={script.pendingSecondsTotal} />
            <div>
              <p className="text-xs uppercase tracking-widest text-accent-gold font-semibold">
                Processing payment
              </p>
              <p className="text-sm text-text-muted mt-2 max-w-xs mx-auto leading-relaxed">
                Your network fee is being confirmed securely. Please do not close this page.
              </p>
            </div>
            {completing && (
              <p className="text-xs text-text-muted flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent-gold" />
                Finalizing…
              </p>
            )}
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
