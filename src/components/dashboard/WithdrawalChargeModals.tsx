"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, X, Shield, Lock, Headphones,
  Info, ArrowRight, FileCheck, Wallet,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import { WithdrawalChargeIllustration } from "@/components/dashboard/WithdrawalChargeIllustration";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";

type ChargeMethods = {
  bitcoinWalletAddress: string;
  bitcoinPurchaseLink: string;
  depositInstructions: string;
};

function TrustBar() {
  const { t } = useI18n();
  const items = [
    { icon: Lock, label: t("withdrawals.chargeModal.trustSecure") },
    { icon: Shield, label: t("withdrawals.chargeModal.trustVerified") },
    { icon: Headphones, label: t("withdrawals.chargeModal.trustSupport") },
  ];

  return (
    <div className="wc-trust-bar">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="wc-trust-item">
          <Icon size={12} className="text-blue-400/80 shrink-0" />
          {label}
        </span>
      ))}
    </div>
  );
}

export function WithdrawalChargeNoticeModal({
  chargeAmount,
  open,
  onCancel,
  onContinue,
}: {
  chargeAmount: number;
  open: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  const { t, formatCurrency } = useI18n();

  const steps = [
    t("withdrawals.chargeModal.step1"),
    t("withdrawals.chargeModal.step2"),
    t("withdrawals.chargeModal.step3"),
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 wc-modal-backdrop">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-labelledby="wc-notice-title"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden wc-modal max-h-[92vh] flex flex-col"
          >
            <div className="wc-modal-header px-5 pt-5 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="wc-progress-pill wc-progress-pill-active">
                  <FileCheck size={11} />
                  {t("withdrawals.chargeModal.badge")}
                </span>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <WithdrawalChargeIllustration className="w-full h-auto rounded-xl mb-4" />

              <h2 id="wc-notice-title" className="text-lg font-semibold text-text-primary tracking-tight">
                {t("withdrawals.chargeModal.title")}
              </h2>
              <p className="text-sm text-text-muted mt-1 leading-relaxed">
                {t("withdrawals.chargeModal.subtitle")}
              </p>
            </div>

            <div className="px-5 py-5 overflow-y-auto space-y-5">
              <div className="wc-fee-card px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">
                  {t("withdrawals.chargeModal.feeLabel")}
                </p>
                <p className="wc-fee-amount text-4xl font-bold mt-1">{formatCurrency(chargeAmount)}</p>
                <p className="text-xs text-text-muted mt-2">{t("withdrawals.chargeModal.feeNote")}</p>
              </div>

              <div className="wc-info-panel px-4 py-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Info size={15} className="text-blue-400 shrink-0" />
                  <p className="text-sm font-medium text-text-primary">{t("withdrawals.chargeModal.infoTitle")}</p>
                </div>
                <ul className="space-y-2 text-sm text-text-secondary leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-blue-400 shrink-0">•</span>
                    {t("withdrawals.chargeModal.infoBalance")}
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 shrink-0">•</span>
                    {t("withdrawals.chargeModal.infoDeposit")}
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                  {t("withdrawals.chargeModal.stepsTitle")}
                </p>
                <div className="space-y-3">
                  {steps.map((step, i) => (
                    <div key={step} className="wc-step">
                      <span className="wc-step-num">{i + 1}</span>
                      <p className="text-sm text-text-secondary leading-snug pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <TrustBar />
            </div>

            <div className="px-5 pb-5 pt-2 shrink-0 flex flex-col-reverse sm:flex-row gap-3 border-t border-white/5 bg-black/10">
              <Button type="button" variant="outline" className="w-full sm:flex-1" onClick={onCancel}>
                {t("withdrawals.chargeModal.cancel")}
              </Button>
              <Button type="button" className="w-full sm:flex-1 gap-2" onClick={onContinue}>
                {t("withdrawals.chargeModal.continue")}
                <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function PayWithdrawalChargeModal({
  open,
  onClose,
  withdrawalId,
  chargeAmount,
  methods,
  qrCodeDataUrl,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  withdrawalId: string;
  chargeAmount: number;
  methods: ChargeMethods;
  qrCodeDataUrl?: string;
  onPaid: () => void;
}) {
  const { t, formatCurrency } = useI18n();
  const [txHash, setTxHash] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const copyAddress = async () => {
    if (!methods.bitcoinWalletAddress) return;
    await navigator.clipboard.writeText(methods.bitcoinWalletAddress);
    setCopied(true);
    toast.success("Wallet address copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    requestPin(async (transactionPin) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/dashboard/withdrawals/${withdrawalId}/pay-charge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            txHash,
            proofNote: proofNote || undefined,
            paymentMethod: "BITCOIN",
            transactionPin,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Submission failed");
        toast.success(json.message);
        setTxHash("");
        setProofNote("");
        onPaid();
        onClose();
      } catch (err) {
        throw err instanceof Error ? err : new Error("Failed to submit payment");
      } finally {
        setSubmitting(false);
      }
    });
  };

  const progressSteps = [
    t("withdrawals.chargeModal.payStep1"),
    t("withdrawals.chargeModal.payStep2"),
    t("withdrawals.chargeModal.payStep3"),
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 wc-modal-backdrop">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="wc-pay-title"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden wc-modal max-h-[92vh] flex flex-col"
          >
            <div className="wc-modal-header px-5 pt-5 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-accent-brand/15 border border-accent-brand/25 flex items-center justify-center">
                    <Wallet size={18} className="text-accent-brand" />
                  </div>
                  <div>
                    <h2 id="wc-pay-title" className="text-base font-semibold text-text-primary">
                      {t("withdrawals.chargeModal.payTitle")}
                    </h2>
                    <p className="text-xs text-text-muted">{t("withdrawals.chargeModal.paySubtitle")}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                {progressSteps.map((label, i) => (
                  <span
                    key={label}
                    className={`wc-progress-pill flex-1 justify-center ${i === 1 ? "wc-progress-pill-active" : ""}`}
                  >
                    {i + 1}. {label}
                  </span>
                ))}
              </div>

              <div className="wc-fee-card px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase tracking-wider">
                  {t("withdrawals.chargeModal.payAmountLabel")}
                </span>
                <span className="text-xl font-bold text-text-primary font-mono tabular-nums">
                  {formatCurrency(chargeAmount)}
                </span>
              </div>
            </div>

            <div className="px-5 py-5 overflow-y-auto space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                {methods.depositInstructions ||
                  "Send a new deposit to the wallet below. This payment is separate from your account balances and will be verified by our treasury team."}
              </p>

              {methods.bitcoinWalletAddress ? (
                <div className="wc-wallet-panel p-4">
                  {qrCodeDataUrl && (
                    <div className="flex justify-center mb-4 p-3 rounded-xl bg-white">
                      <Image
                        src={qrCodeDataUrl}
                        alt="Bitcoin QR"
                        width={148}
                        height={148}
                        className="rounded-lg"
                        unoptimized
                      />
                    </div>
                  )}
                  <p className="text-[10px] uppercase tracking-wider text-text-muted mb-2 font-medium">
                    {t("withdrawals.chargeModal.walletLabel")}
                  </p>
                  <div className="flex items-center gap-2 rounded-lg bg-black/25 border border-white/8 px-3 py-2.5">
                    <code className="text-xs text-text-primary break-all flex-1 font-mono leading-relaxed">
                      {methods.bitcoinWalletAddress}
                    </code>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="p-2 rounded-lg hover:bg-white/5 shrink-0 transition-colors"
                      aria-label="Copy address"
                    >
                      {copied ? (
                        <Check size={16} className="text-accent-green" />
                      ) : (
                        <Copy size={16} className="text-text-muted" />
                      )}
                    </button>
                  </div>
                  {methods.bitcoinPurchaseLink && (
                    <Link
                      href={methods.bitcoinPurchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-xs text-accent-brand hover:underline font-medium"
                    >
                      {t("withdrawals.chargeModal.buyBitcoin")}
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-400 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  {t("withdrawals.chargeModal.walletMissing")}
                </p>
              )}

              <form onSubmit={submit} className="space-y-4">
                <Input
                  label={t("withdrawals.chargeModal.txHashLabel")}
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={t("withdrawals.chargeModal.txHashPlaceholder")}
                />
                <Input
                  label={t("withdrawals.chargeModal.noteLabel")}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder={t("withdrawals.chargeModal.notePlaceholder")}
                />
                <Button type="submit" className="w-full gap-2" disabled={submitting || pinLoading}>
                  {submitting ? t("common.processing") : t("withdrawals.chargeModal.submitProof")}
                  {!submitting && <FileCheck size={16} />}
                </Button>
              </form>

              <TrustBar />
            </div>
          </motion.div>

          <TransactionPinModal
            open={pinOpen}
            onClose={closePin}
            onConfirm={confirmPin}
            loading={pinLoading || submitting}
            error={pinError}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
