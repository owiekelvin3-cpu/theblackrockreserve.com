"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { PayoutSuccessHero } from "@/components/dashboard/PayoutTransitLogoAnimation";
import { getWithdrawalMethod, type WithdrawalMethodId } from "@/lib/withdrawal-methods";
import { useI18n } from "@/components/providers/I18nProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  withdrawal: {
    method: WithdrawalMethodId | string;
    methodLabel: string;
    amountUsd: number;
    destination: string;
    destinationExtra?: string | null;
    createdAt: string;
  } | null;
};

export default function WithdrawalSentSuccessModal({ open, onClose, withdrawal }: Props) {
  const { formatCurrency } = useI18n();
  const methodDef = withdrawal ? getWithdrawalMethod(withdrawal.method) : null;

  return (
    <AnimatePresence>
      {open && withdrawal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-border bg-bg-elevated shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdrawal-sent-success-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/10 z-10"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="p-6 pt-8 space-y-5">
              {methodDef && (
                <PayoutSuccessHero method={methodDef} institutionLabel={withdrawal.methodLabel} />
              )}

              <div className="text-center space-y-1.5">
                <p className="text-xs uppercase tracking-wider text-accent-green font-semibold">
                  Successful
                </p>
                <h2 id="withdrawal-sent-success-title" className="text-lg font-bold text-white">
                  Funds sent successfully
                </h2>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatCurrency(withdrawal.amountUsd)}
                </p>
                <p className="text-sm text-text-muted leading-relaxed">
                  Your {withdrawal.methodLabel} payout was sent to{" "}
                  <span className="text-white/90 break-all">{withdrawal.destination}</span>.
                </p>
                {withdrawal.destinationExtra && (
                  <p className="text-xs text-text-muted">{withdrawal.destinationExtra}</p>
                )}
                <p className="text-[11px] text-text-muted">
                  {new Date(withdrawal.createdAt).toLocaleString()}
                </p>
              </div>

              <Button type="button" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
