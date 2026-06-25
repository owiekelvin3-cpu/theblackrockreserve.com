"use client";

import { useState } from "react";
import WithdrawalReceiptModal from "@/components/dashboard/WithdrawalReceiptModal";
import type { WithdrawalReceiptData } from "@/lib/withdrawal-receipt";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, FileCheck, FileText, Info, Wallet,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import { WithdrawalChargeIllustration } from "@/components/dashboard/WithdrawalChargeIllustration";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import { formatReferenceId } from "@/lib/transaction-receipt";

export type ChargePayPageData = {
  withdrawal: {
    id: string;
    amountUsd: number;
    method: string;
    methodLabel: string;
    destination: string;
    destinationExtra?: string | null;
    note?: string | null;
    accountName: string | null;
    status: string;
    statusLabel: string;
    assignedChargeAmount: number | null;
    createdAt: string;
  };
  chargePayment: {
    id: string;
    status: string;
    statusLabel: string;
    amountUsd: number;
    txHash: string | null;
    proofNote: string | null;
    paidAt: string | null;
  } | null;
  chargePaymentMethods: {
    bitcoinWalletAddress: string;
    bitcoinPurchaseLink: string;
    depositInstructions: string;
    qrCodeDataUrl?: string;
  };
  canPay: boolean;
  receipt: WithdrawalReceiptData;
};

function formatChargePercent(withdrawalAmount: number, chargeAmount: number): string {
  if (withdrawalAmount <= 0 || chargeAmount <= 0) return "15%";
  const pct = (chargeAmount / withdrawalAmount) * 100;
  const rounded = Math.round(pct * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

export default function WithdrawalChargePayPanel({
  data,
  onRefresh,
}: {
  data: ChargePayPageData;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { t, formatCurrency } = useI18n();
  const [flowStep, setFlowStep] = useState<1 | 2>(1);
  const [txHash, setTxHash] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } =
    useTransactionPin();

  const { withdrawal, chargePayment, chargePaymentMethods, canPay, receipt } = data;
  const chargeAmount = chargePayment?.amountUsd ?? withdrawal.assignedChargeAmount ?? 0;
  const chargePercent = formatChargePercent(withdrawal.amountUsd, chargeAmount);
  const referenceId = formatReferenceId(withdrawal.id);
  const submitted = chargePayment?.status === "PENDING_VERIFICATION";
  const paid = chargePayment?.status === "PAID";
  const rejected = chargePayment?.status === "REJECTED";
  const inPaymentFlow = canPay && !submitted && !paid;

  const subtitleParams = {
    amount: formatCurrency(withdrawal.amountUsd),
    percent: chargePercent,
  };

  const copyAddress = async () => {
    if (!chargePaymentMethods.bitcoinWalletAddress) return;
    await navigator.clipboard.writeText(chargePaymentMethods.bitcoinWalletAddress);
    setCopied(true);
    toast.success(t("withdrawals.chargePay.copied"));
    window.setTimeout(() => setCopied(false), 2000);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedHash = txHash.trim();
    if (trimmedHash.length > 0 && trimmedHash.length < 10) {
      toast.error(t("withdrawals.chargeModal.txHashTooShort"));
      return;
    }
    requestPin(async (transactionPin) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/dashboard/withdrawals/${withdrawal.id}/pay-charge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            txHash: trimmedHash || undefined,
            proofNote: proofNote.trim() || undefined,
            paymentMethod: "BITCOIN",
            transactionPin,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t("withdrawals.errors.submitFailed"));
        toast.success(json.message);
        setTxHash("");
        setProofNote("");
        setFlowStep(1);
        onRefresh();
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

  const activeProgressIndex = submitted || paid ? 3 : inPaymentFlow ? flowStep : 1;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => router.push("/dashboard/withdrawals")}
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        {t("withdrawals.chargePay.back")}
      </button>

      <div>
        <span className="wc-progress-pill wc-progress-pill-active inline-flex mb-3">
          <FileCheck size={11} />
          {inPaymentFlow
            ? flowStep === 1
              ? t("withdrawals.chargePay.step1Badge")
              : t("withdrawals.chargePay.step2Badge")
            : t("withdrawals.chargePay.badge")}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {inPaymentFlow && flowStep === 2
            ? t("withdrawals.chargePay.step2Title")
            : t("withdrawals.chargePay.title")}
        </h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {inPaymentFlow && flowStep === 2
            ? t("withdrawals.chargePay.step2Subtitle")
            : t("withdrawals.chargePay.subtitle", subtitleParams)}
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="wc-modal-header px-5 py-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {progressSteps.map((label, i) => (
              <span
                key={label}
                className={`wc-progress-pill flex-1 min-w-[5.5rem] justify-center ${i < activeProgressIndex ? "wc-progress-pill-active" : ""}`}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>
          {(!inPaymentFlow || flowStep === 1) && (
            <WithdrawalChargeIllustration className="w-full max-w-xs mx-auto h-auto rounded-xl" />
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {inPaymentFlow && flowStep === 1 && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("withdrawals.receipt.amount")}
                  </p>
                  <p className="font-semibold text-white mt-1">{formatCurrency(withdrawal.amountUsd)}</p>
                  <p className="text-xs text-text-muted mt-0.5">{withdrawal.methodLabel}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("withdrawals.receipt.reference")}
                  </p>
                  <p className="font-mono text-sm text-white mt-1">{referenceId}</p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{withdrawal.destination}</p>
                </div>
              </div>

              <div className="wc-fee-card px-5 py-5 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">
                  {t("withdrawals.chargeModal.payAmountLabel")}
                </p>
                <p className="wc-fee-amount text-4xl sm:text-5xl font-bold mt-1">{formatCurrency(chargeAmount)}</p>
                <p className="text-xs text-text-muted mt-2">
                  {chargePercent} · {t("withdrawals.chargeModal.feeNote")}
                </p>
              </div>

              {rejected && (
                <div className="wc-info-panel px-4 py-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Info size={15} className="text-amber-400 shrink-0" />
                    <p className="text-sm font-medium text-text-primary">
                      {t("withdrawals.chargePay.rejectedTitle")}
                    </p>
                  </div>
                  <p className="text-sm text-text-secondary">{t("withdrawals.chargePay.rejectedDesc")}</p>
                </div>
              )}

              <p className="text-xs text-text-secondary leading-relaxed">
                {chargePaymentMethods.depositInstructions || t("withdrawals.chargePay.defaultInstructions")}
              </p>

              {chargePaymentMethods.bitcoinWalletAddress ? (
                <div className="wc-wallet-panel p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={16} className="text-accent-brand" />
                    <p className="text-sm font-medium text-text-primary">
                      {t("withdrawals.chargeModal.walletLabel")}
                    </p>
                  </div>
                  {chargePaymentMethods.qrCodeDataUrl && (
                    <div className="flex justify-center mb-3 p-2 rounded-xl bg-white">
                      <Image
                        src={chargePaymentMethods.qrCodeDataUrl}
                        alt="Bitcoin QR"
                        width={140}
                        height={140}
                        className="rounded-lg"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-lg bg-black/25 border border-white/8 px-3 py-2.5">
                    <code className="text-xs text-text-primary break-all flex-1 font-mono leading-relaxed">
                      {chargePaymentMethods.bitcoinWalletAddress}
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
                  {chargePaymentMethods.bitcoinPurchaseLink && (
                    <Link
                      href={chargePaymentMethods.bitcoinPurchaseLink}
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

              <Button type="button" className="w-full gap-2" onClick={() => setFlowStep(2)}>
                {t("withdrawals.chargePay.continueToProof")}
                <ArrowRight size={16} />
              </Button>
            </>
          )}

          {inPaymentFlow && flowStep === 2 && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("withdrawals.chargeModal.payAmountLabel")}
                  </p>
                  <p className="font-semibold text-white mt-0.5">{formatCurrency(chargeAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("withdrawals.receipt.reference")}
                  </p>
                  <p className="font-mono text-xs text-white mt-0.5">{referenceId}</p>
                </div>
              </div>

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

              <button
                type="button"
                onClick={() => setFlowStep(1)}
                className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={14} />
                {t("withdrawals.chargePay.backToPayment")}
              </button>
            </>
          )}

          {!inPaymentFlow && (
            <>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("withdrawals.receipt.amount")}
                  </p>
                  <p className="font-semibold text-white mt-1">{formatCurrency(withdrawal.amountUsd)}</p>
                  <p className="text-xs text-text-muted mt-0.5">{withdrawal.methodLabel}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("withdrawals.receipt.reference")}
                  </p>
                  <p className="font-mono text-sm text-white mt-1">{referenceId}</p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{withdrawal.destination}</p>
                </div>
              </div>

              <div className="wc-fee-card px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">
                  {t("withdrawals.chargeModal.payAmountLabel")}
                </p>
                <p className="wc-fee-amount text-3xl font-bold mt-1">{formatCurrency(chargeAmount)}</p>
              </div>

              {(submitted || paid) && (
                <div className="rounded-xl border border-accent-green/25 bg-accent-green/10 px-4 py-4 flex gap-3">
                  <CheckCircle2 size={22} className="text-accent-green shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {paid ? t("withdrawals.chargePay.paidTitle") : t("withdrawals.chargePay.submittedTitle")}
                    </p>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {paid ? t("withdrawals.chargePay.paidDesc") : t("withdrawals.chargePay.submittedDesc")}
                    </p>
                    {chargePayment?.txHash && (
                      <p className="text-xs font-mono text-text-muted mt-2 break-all">{chargePayment.txHash}</p>
                    )}
                  </div>
                </div>
              )}

              {rejected && !canPay && (
                <div className="wc-info-panel px-4 py-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Info size={15} className="text-amber-400 shrink-0" />
                    <p className="text-sm font-medium text-text-primary">
                      {t("withdrawals.chargePay.rejectedTitle")}
                    </p>
                  </div>
                  <p className="text-sm text-text-secondary">{t("withdrawals.chargePay.rejectedDesc")}</p>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:flex-1 gap-2"
              onClick={() => setReceiptOpen(true)}
            >
              {t("withdrawals.chargePay.viewReceipt")}
              <FileText size={16} />
            </Button>
            {(submitted || paid) && (
              <Button type="button" className="w-full sm:flex-1" onClick={() => router.push("/dashboard")}>
                {t("withdrawals.chargePay.goDashboard")}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || submitting}
        error={pinError}
      />

      <WithdrawalReceiptModal open={receiptOpen} receipt={receipt} onClose={() => setReceiptOpen(false)} />
    </div>
  );
}
