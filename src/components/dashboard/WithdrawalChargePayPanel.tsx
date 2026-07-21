"use client";

import { useState } from "react";
import WithdrawalReceiptModal from "@/components/dashboard/WithdrawalReceiptModal";
import type { WithdrawalReceiptData } from "@/lib/withdrawal-receipt";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, CheckCircle2, FileCheck, FileText, Info, Wallet,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useI18n } from "@/components/providers/I18nProvider";
import { WithdrawalChargeIllustration } from "@/components/dashboard/WithdrawalChargeIllustration";
import WithdrawalChargeStatusTimeline from "@/components/dashboard/WithdrawalChargeStatusTimeline";
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
    hasProofImage?: boolean;
    paidAt: string | null;
  } | null;
  chargePaymentMethods: {
    bitcoinWalletAddress: string;
    bitcoinPurchaseLink: string;
    depositInstructions: string;
    qrCodeDataUrl?: string;
  };
  content?: {
    overviewMessage?: string;
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
}: {
  data: ChargePayPageData;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const { t, formatCurrency } = useI18n();
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { withdrawal, chargePayment, canPay, receipt } = data;
  const chargeAmount = chargePayment?.amountUsd ?? withdrawal.assignedChargeAmount ?? 0;
  const chargePercent = formatChargePercent(withdrawal.amountUsd, chargeAmount);
  const referenceId = formatReferenceId(withdrawal.id);
  const submitted = chargePayment?.status === "PENDING_VERIFICATION";
  const paid = chargePayment?.status === "PAID";
  const rejected = chargePayment?.status === "REJECTED";
  const inPaymentFlow = canPay && !submitted && !paid;

  const goToPayment = () => {
    router.push(`/dashboard/withdrawals/${withdrawal.id}/pay-charge/payment`);
  };

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
          {t("withdrawals.chargePay.overviewBadge")}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-white">{t("withdrawals.chargePay.title")}</h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {data.content?.overviewMessage ??
            t("withdrawals.chargePay.subtitle", {
              amount: formatCurrency(withdrawal.amountUsd),
              percent: chargePercent,
            })}
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="wc-modal-header px-5 py-4 space-y-4">
          <WithdrawalChargeIllustration className="w-full max-w-xs mx-auto h-auto rounded-xl" />
          <WithdrawalChargeStatusTimeline chargeStatus={chargePayment?.status} />
        </div>

        <div className="p-5 sm:p-6 space-y-5">
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

          {inPaymentFlow && (
            <Button type="button" className="w-full gap-2" onClick={goToPayment}>
              <Wallet size={16} />
              {t("withdrawals.chargePay.payFee")}
              <ArrowRight size={16} />
            </Button>
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

      <WithdrawalReceiptModal open={receiptOpen} receipt={receipt} onClose={() => setReceiptOpen(false)} />
    </div>
  );
}
