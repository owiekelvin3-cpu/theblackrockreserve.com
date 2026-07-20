"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Shield,
  Wallet,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";

export type ProfitTaxPageData = {
  request: {
    id: string;
    amountUsd: number;
    assignedTaxAmount: number;
    taxPercentage: number;
    status: string;
    statusLabel: string;
    referenceId: string;
    createdAt: string;
  };
  taxPayment: {
    id: string;
    status: string;
    statusLabel: string;
    amountUsd: number;
    paymentMethod: string;
    txHash: string | null;
    proofNote: string | null;
    hasProofImage?: boolean;
    paidAt: string | null;
  } | null;
  paymentMethods: {
    bitcoinWalletAddress: string;
    bitcoinPurchaseLink: string;
    depositInstructions: string;
    qrCodeDataUrl?: string;
  };
  spendableBalance: number;
  canPayFromBalance: boolean;
  canPayExternal: boolean;
};

export default function ProfitTaxPayPanel({
  data,
  onRefresh,
}: {
  data: ProfitTaxPageData;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { t, formatCurrency } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } =
    useTransactionPin();

  const { request, taxPayment, spendableBalance, canPayFromBalance, canPayExternal } = data;
  const taxAmount = taxPayment?.amountUsd ?? request.assignedTaxAmount;
  const submitted = taxPayment?.status === "PENDING_VERIFICATION";
  const paid = taxPayment?.status === "PAID" || request.status === "COMPLETED";
  const rejected = taxPayment?.status === "REJECTED";
  const inPaymentFlow = canPayExternal && !submitted && !paid;

  const payFromBalance = () => {
    requestPin(async (transactionPin) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/dashboard/profit/tax/${request.id}/pay-from-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ transactionPin }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t("investments.profitTax.payFailed"));
        toast.success(json.message);
        onRefresh();
      } finally {
        setSubmitting(false);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        {t("investments.profitTax.back")}
      </button>

      <div>
        <span className="wc-progress-pill wc-progress-pill-active inline-flex mb-3">
          <Shield size={11} />
          {t("investments.profitTax.badge")}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-white">{t("investments.profitTax.title")}</h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {t("investments.profitTax.subtitle", {
            percent: String(request.taxPercentage),
            amount: formatCurrency(request.amountUsd),
          })}
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="p-5 sm:p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                {t("investments.profitTax.profitAmount")}
              </p>
              <p className="font-semibold text-white mt-1">{formatCurrency(request.amountUsd)}</p>
              <p className="text-xs text-text-muted mt-0.5">{t("investments.profitTax.heldNote")}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-text-muted">
                {t("investments.profitTax.reference")}
              </p>
              <p className="font-mono text-sm text-white mt-1">{request.referenceId}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {request.taxPercentage}% {t("investments.profitTax.taxRate")}
              </p>
            </div>
          </div>

          <div className="wc-fee-card px-5 py-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">
              {t("investments.profitTax.taxDue")}
            </p>
            <p className="wc-fee-amount text-4xl sm:text-5xl font-bold mt-1">{formatCurrency(taxAmount)}</p>
            <p className="text-xs text-text-muted mt-2">{t("investments.profitTax.feeNote")}</p>
          </div>

          {rejected && (
            <div className="wc-info-panel px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1">
                <Info size={15} className="text-amber-400 shrink-0" />
                <p className="text-sm font-medium text-text-primary">
                  {t("investments.profitTax.rejectedTitle")}
                </p>
              </div>
              <p className="text-sm text-text-secondary">{t("investments.profitTax.rejectedDesc")}</p>
            </div>
          )}

          {!inPaymentFlow && (
            <div className="text-center py-2 space-y-3">
              <div
                className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${
                  paid
                    ? "bg-accent-green/15 border border-accent-green/25"
                    : "bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                <CheckCircle2 size={28} className={paid ? "text-accent-green" : "text-amber-400"} />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {paid ? t("investments.profitTax.paidTitle") : t("investments.profitTax.submittedTitle")}
                </p>
                <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto leading-relaxed">
                  {paid ? t("investments.profitTax.paidDesc") : t("investments.profitTax.submittedDesc")}
                </p>
              </div>
              <Button type="button" className="w-full" onClick={() => router.push("/dashboard")}>
                {t("investments.profitTax.goDashboard")}
              </Button>
            </div>
          )}

          {inPaymentFlow && (
            <>
              {canPayFromBalance && (
                <div className="rounded-xl border border-accent-green/25 bg-accent-green/5 px-4 py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-accent-green/15 border border-accent-green/25 flex items-center justify-center shrink-0">
                      <Wallet size={16} className="text-accent-green" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {t("investments.profitTax.payFromBalanceTitle")}
                      </p>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {t("investments.profitTax.payFromBalanceDesc", {
                          available: formatCurrency(spendableBalance),
                          tax: formatCurrency(taxAmount),
                        })}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full gap-2"
                    disabled={submitting || pinLoading}
                    onClick={payFromBalance}
                  >
                    {submitting ? t("common.processing") : t("investments.profitTax.payFromBalanceCta")}
                  </Button>
                </div>
              )}

              {!canPayFromBalance && spendableBalance > 0 && spendableBalance < taxAmount && (
                <p className="text-xs text-amber-400/90 leading-relaxed">
                  {t("investments.profitTax.insufficientBalance", {
                    available: formatCurrency(spendableBalance),
                    tax: formatCurrency(taxAmount),
                  })}
                </p>
              )}

              <Button
                type="button"
                className="w-full gap-2"
                onClick={() => router.push(`/dashboard/profit/tax/${request.id}/payment`)}
              >
                <Wallet size={16} />
                {t("investments.profitTax.payFee")}
                <ArrowRight size={16} />
              </Button>
            </>
          )}
        </div>
      </Card>

      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || submitting}
        error={pinError}
      />
    </div>
  );
}
