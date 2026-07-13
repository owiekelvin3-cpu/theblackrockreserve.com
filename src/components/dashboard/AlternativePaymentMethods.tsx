"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Headphones,
  MessageCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  SiApplepay,
  SiGooglepay,
  SiMastercard,
  SiVisa,
} from "react-icons/si";
import Button from "@/components/ui/Button";
import { useChat } from "@/components/providers/ChatProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

const METHODS = [
  { id: "visa", label: "Visa", Icon: SiVisa, color: "#1A1F71" },
  { id: "mastercard", label: "Mastercard", Icon: SiMastercard, color: "#EB001B" },
  { id: "applepay", label: "Apple Pay", Icon: SiApplepay, color: "currentColor" },
  { id: "googlepay", label: "Google Pay", Icon: SiGooglepay, color: "currentColor" },
  { id: "bank", label: "Bank Transfer", Icon: Building2, color: "currentColor" },
] as const;

type AlternativePaymentMethodsProps = {
  className?: string;
  /** Pre-fill human support with a payment request context. */
  supportPrefill?: string;
};

export default function AlternativePaymentMethods({
  className,
  supportPrefill,
}: AlternativePaymentMethodsProps) {
  const { t } = useI18n();
  const { openHumanSupport } = useChat();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleContactSupport = () => {
    setOpen(false);
    if (supportPrefill && typeof window !== "undefined") {
      try {
        sessionStorage.setItem("br-support-prefill", supportPrefill);
      } catch {
        /* ignore */
      }
    }
    openHumanSupport();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("wc-alt-pay-trigger", className)}
        aria-haspopup="dialog"
      >
        <div className="wc-alt-pay-trigger-copy">
          <p className="wc-alt-pay-trigger-title">{t("withdrawals.altPay.title")}</p>
          <p className="wc-alt-pay-trigger-desc">{t("withdrawals.altPay.triggerDesc")}</p>
        </div>
        <div className="wc-alt-pay-icons" aria-hidden>
          {METHODS.map(({ id, label, Icon, color }) => (
            <span key={id} className="wc-alt-pay-icon" title={label}>
              <Icon size={id === "bank" ? 14 : 16} color={color} />
            </span>
          ))}
        </div>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div
                className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4"
                role="presentation"
                onClick={() => setOpen(false)}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="alt-pay-title"
                  initial={{ opacity: 0, y: 28, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.98 }}
                  transition={{ type: "spring", damping: 26, stiffness: 320 }}
                  className="relative z-[1] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 bg-bg-secondary shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-5 pt-5 pb-4 border-b border-white/8">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="absolute right-4 top-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5"
                      aria-label={t("common.close")}
                    >
                      <X size={18} />
                    </button>
                    <div className="flex items-center gap-3 pr-8">
                      <div className="h-11 w-11 rounded-xl bg-accent-brand/15 border border-accent-brand/25 flex items-center justify-center shrink-0">
                        <Headphones size={20} className="text-accent-brand" />
                      </div>
                      <div>
                        <h2 id="alt-pay-title" className="text-lg font-semibold text-text-primary">
                          {t("withdrawals.altPay.modalTitle")}
                        </h2>
                        <p className="text-xs text-text-muted mt-0.5">
                          {t("withdrawals.altPay.modalEyebrow")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-5 space-y-5">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {t("withdrawals.altPay.modalDesc")}
                    </p>

                    <div className="wc-alt-pay-methods-grid">
                      {METHODS.map(({ id, label, Icon, color }) => (
                        <div key={id} className="wc-alt-pay-method-chip">
                          <span className="wc-alt-pay-method-chip-icon">
                            <Icon size={id === "bank" ? 16 : 18} color={color} />
                          </span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck size={16} className="text-accent-brand shrink-0 mt-0.5" />
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {t("withdrawals.altPay.secureNote")}
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <MessageCircle size={16} className="text-accent-brand shrink-0 mt-0.5" />
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {t("withdrawals.altPay.humanNote")}
                        </p>
                      </div>
                    </div>

                    <Button type="button" className="w-full gap-2" onClick={handleContactSupport}>
                      <Headphones size={16} />
                      {t("withdrawals.altPay.contactSupport")}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors py-1"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
