"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Building2, PlusCircle, X } from "lucide-react";
import Button from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onNewWithdrawal: () => void;
  onUseAnotherBank: () => void;
};

export default function BankRejectContinueModal({
  open,
  onClose,
  onNewWithdrawal,
  onUseAnotherBank,
}: Props) {
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-xl border border-border bg-bg-elevated shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bank-reject-continue-title"
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
              <div>
                <p className="text-xs uppercase tracking-wider text-text-muted font-medium">Next step</p>
                <h2 id="bank-reject-continue-title" className="text-lg font-bold text-white mt-1">
                  How would you like to continue?
                </h2>
                <p className="text-sm text-text-muted mt-2 leading-relaxed">
                  You can start a new withdrawal right away or pay the processing fee using a different receiving
                  account.
                </p>
              </div>

              <div className="space-y-3">
                <Button type="button" className="w-full gap-2 justify-start h-auto py-3.5 px-4" onClick={onNewWithdrawal}>
                  <PlusCircle size={20} className="shrink-0" />
                  <span className="text-left">
                    <span className="block font-semibold">Initiate a new withdrawal</span>
                    <span className="block text-xs font-normal text-white/80 mt-0.5">
                      Enter a new amount and payout details on the withdrawals page
                    </span>
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 justify-start h-auto py-3.5 px-4 border-white/15"
                  onClick={onUseAnotherBank}
                >
                  <Building2 size={20} className="shrink-0 text-accent-gold" />
                  <span className="text-left">
                    <span className="block font-semibold">Use another receiving bank</span>
                    <span className="block text-xs font-normal text-text-secondary mt-0.5">
                      Pay the processing fee to continue this request
                    </span>
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
