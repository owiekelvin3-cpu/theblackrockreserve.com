"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDownToLine, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ProfitWithdrawPanel from "@/components/dashboard/ProfitWithdrawPanel";
import { useI18n } from "@/components/providers/I18nProvider";

interface ProfitWithdrawButtonProps {
  profitBalance: number;
  onSuccess: () => void;
  className?: string;
  /** Full-width trigger on mobile (investments card) */
  block?: boolean;
}

export default function ProfitWithdrawButton({
  profitBalance,
  onSuccess,
  className = "",
  block = false,
}: ProfitWithdrawButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const canWithdraw = profitBalance > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const handleSuccess = () => {
    onSuccess();
    setOpen(false);
  };

  const modal =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open && (
          <div
            className="profit-withdraw-backdrop"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="profit-withdraw-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="profit-withdraw-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="profit-withdraw-sheet-handle" aria-hidden />

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="profit-withdraw-close"
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>

              <div className="profit-withdraw-sheet-header">
                <div className="profit-withdraw-sheet-icon" aria-hidden>
                  <ArrowDownToLine size={18} />
                </div>
                <div className="min-w-0">
                  <h2 id="profit-withdraw-title" className="profit-withdraw-sheet-title">
                    {t("investments.profitWithdrawTitle")}
                  </h2>
                  <p className="profit-withdraw-sheet-subtitle">{t("investments.profitWithdrawDesc")}</p>
                </div>
              </div>

              <ProfitWithdrawPanel
                profitBalance={profitBalance}
                onSuccess={handleSuccess}
                embedded
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!canWithdraw) return;
          setOpen(true);
        }}
        disabled={!canWithdraw}
        className={`dash-profit-withdraw-btn ${block ? "dash-profit-withdraw-btn-block" : ""} ${!canWithdraw ? "dash-profit-withdraw-btn-disabled" : ""} ${className}`.trim()}
        aria-label={t("investments.profitWithdrawTitle")}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={!canWithdraw ? t("investments.profitWithdrawNoBalance") : undefined}
      >
        <ArrowDownToLine size={12} strokeWidth={2.5} />
        {t("dashboard.profitWithdraw")}
      </button>

      {modal}
    </>
  );
}
