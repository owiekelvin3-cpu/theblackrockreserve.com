"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import Button from "@/components/ui/Button";
import WithdrawalMethodIcon from "@/components/dashboard/WithdrawalMethodIcon";
import { getWithdrawalMethod } from "@/lib/withdrawal-methods";
import type { WithdrawalMethodId } from "@/lib/withdrawal-methods";

type Props = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  amountUsd: number;
  method: WithdrawalMethodId;
  methodLabel: string;
  statusLabel: string;
  billingStageLabel?: string | null;
  formatCurrency: (n: number) => string;
};

export default function WithdrawalHistoryStageModal({
  open,
  onClose,
  onContinue,
  amountUsd,
  method,
  methodLabel,
  statusLabel,
  billingStageLabel,
  formatCurrency,
}: Props) {
  const methodDef = getWithdrawalMethod(method);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-border bg-bg-elevated shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-stage-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/10"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="p-6 pt-8 space-y-5">
              <div className="flex items-start gap-3">
                {methodDef && (
                  <div className="h-11 w-11 rounded-xl bg-bg-primary border border-white/10 flex items-center justify-center shrink-0">
                    <WithdrawalMethodIcon method={methodDef} size="md" />
                  </div>
                )}
                <div className="min-w-0 pr-8">
                  <p className="text-xs uppercase tracking-wider text-text-muted font-medium">Current status</p>
                  <h2 id="withdrawal-stage-modal-title" className="text-lg font-bold text-white mt-1">
                    {statusLabel}
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    {formatCurrency(amountUsd)} · {methodLabel}
                  </p>
                  {billingStageLabel && (
                    <p className="text-xs text-accent-gold mt-2 font-medium">{billingStageLabel}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-text-muted leading-relaxed">
                All three billing steps stay on this one history item. Continue where you left off — even if you closed
                the app.
              </p>

              <Button type="button" className="w-full gap-2" onClick={onContinue}>
                Continue
                <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
