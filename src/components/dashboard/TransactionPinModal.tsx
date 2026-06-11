"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import TransactionPinInput from "@/components/dashboard/TransactionPinInput";
import { useI18n } from "@/components/providers/I18nProvider";

interface TransactionPinModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void | Promise<void>;
  loading?: boolean;
  error?: string;
  title?: string;
  description?: string;
}

export default function TransactionPinModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  error = "",
  title,
  description,
}: TransactionPinModalProps) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin("");
      return;
    }
    fetch("/api/dashboard/security/transaction-pin")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setPinConfigured(data.configured);
          setLocked(!!data.locked);
        }
      })
      .catch(() => setPinConfigured(null));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || loading || locked) return;
    await onConfirm(pin);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={loading ? undefined : onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 bg-bg-secondary p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="absolute right-4 top-4 p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 disabled:opacity-50"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-accent-brand/15 border border-accent-brand/25 flex items-center justify-center mb-4">
                <Lock size={22} className="text-accent-brand" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">
                {title ?? t("transactionPin.confirmTitle")}
              </h2>
              <p className="text-sm text-text-muted mt-2 max-w-xs">
                {description ?? t("transactionPin.confirmDesc")}
              </p>
            </div>

            {pinConfigured === false && (
              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <p>{t("transactionPin.notSet")}</p>
                <Link href="/dashboard/settings" className="inline-flex items-center gap-1.5 mt-2 text-accent-brand hover:underline font-medium">
                  <ShieldCheck size={14} />
                  {t("transactionPin.setupLink")}
                </Link>
              </div>
            )}

            {locked && (
              <p className="mt-5 text-sm text-accent-red text-center">{t("transactionPin.locked")}</p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <TransactionPinInput
                value={pin}
                onChange={setPin}
                disabled={loading || locked || pinConfigured === false}
                autoFocus
              />

              {error && <p className="text-sm text-accent-red text-center">{error}</p>}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={onClose} disabled={loading}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:flex-1"
                  disabled={loading || pin.length !== 4 || locked || pinConfigured === false}
                  isLoading={loading}
                >
                  {t("transactionPin.confirm")}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
