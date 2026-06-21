"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Headphones, X } from "lucide-react";
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
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-xl border border-border bg-bg-elevated shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="frozen-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-md text-text-muted hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <h2 id="frozen-modal-title" className="text-base font-semibold text-text-primary pr-8">
                Withdrawals unavailable
              </h2>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                This account is under restriction. Withdrawals cannot be processed at this time.
              </p>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted mb-1">
                  Notice from your institution
                </p>
                <p className="text-sm text-text-primary leading-relaxed">{reason}</p>
              </div>

              <div className="flex flex-col gap-2 mt-5">
                <button
                  type="button"
                  onClick={handleContactSupport}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg brand-gradient-bg text-white text-sm font-medium transition-opacity hover:opacity-90"
                >
                  <Headphones size={16} />
                  Contact support
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-overlay transition-colors"
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
