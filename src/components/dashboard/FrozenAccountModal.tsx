"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Headphones, X } from "lucide-react";
import { useChat } from "@/components/providers/ChatProvider";

type FrozenAccountModalProps = {
  open: boolean;
  reason: string;
  onClose: () => void;
};

export default function FrozenAccountModal({ open, reason, onClose }: FrozenAccountModalProps) {
  const { openHumanSupport } = useChat();

  const handleContactSupport = () => {
    onClose();
    openHumanSupport();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="relative w-full max-w-md rounded-2xl border border-amber-500/30 bg-bg-elevated shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="frozen-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-red-500" />
            <div className="p-6">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-overlay transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} className="text-amber-400" />
                </div>
                <div>
                  <h2 id="frozen-modal-title" className="text-lg font-semibold text-text-primary">
                    Account Frozen
                  </h2>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Your account is currently frozen.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-4">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-amber-400/80 mb-1">
                  Reason
                </p>
                <p className="text-sm text-text-primary leading-relaxed">{reason}</p>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed mb-6">
                Withdrawals are temporarily disabled on this account. If you believe this is an error or
                need assistance, please contact support.
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleContactSupport}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl brand-gradient-bg text-white text-sm font-semibold shadow-brand transition-opacity hover:opacity-90"
                >
                  <Headphones size={16} />
                  Contact Support
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-overlay transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
