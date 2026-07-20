"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  FileCheck,
  ImageIcon,
  Lock,
  Shield,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import AlternativePaymentMethods from "@/components/dashboard/AlternativePaymentMethods";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import type { ProfitTaxPageData } from "@/components/dashboard/ProfitTaxPayPanel";

export default function ProfitTaxPaymentPanel({
  data,
  onRefresh,
}: {
  data: ProfitTaxPageData;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const { t, formatCurrency } = useI18n();
  const [flowStep, setFlowStep] = useState<1 | 2>(1);
  const [txHash, setTxHash] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } =
    useTransactionPin();

  const { request, taxPayment, paymentMethods, canPayExternal } = data;
  const taxAmount = taxPayment?.amountUsd ?? request.assignedTaxAmount;
  const submitted = taxPayment?.status === "PENDING_VERIFICATION";
  const paid = taxPayment?.status === "PAID" || request.status === "COMPLETED";
  const overviewUrl = `/dashboard/profit/tax/${request.id}`;

  useEffect(() => {
    if (!canPayExternal || submitted || paid) {
      router.replace(overviewUrl);
    }
  }, [canPayExternal, submitted, paid, router, overviewUrl]);

  const copyAddress = async () => {
    if (!paymentMethods.bitcoinWalletAddress) return;
    await navigator.clipboard.writeText(paymentMethods.bitcoinWalletAddress);
    setCopied(true);
    toast.success(t("investments.profitTax.copied"));
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t("investments.profitTax.proofImageTooLarge"));
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
      setProofFileName(file.name);
      toast.success(t("investments.profitTax.proofImageUploaded"));
    };
    reader.readAsDataURL(file);
  };

  const clearProofImage = () => {
    setProofImage(null);
    setProofFileName("");
  };

  const submitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage) {
      toast.error(t("investments.profitTax.proofImageRequired"));
      return;
    }
    const trimmedHash = txHash.trim();
    if (trimmedHash.length > 0 && trimmedHash.length < 10) {
      toast.error(t("investments.profitTax.txHashTooShort"));
      return;
    }
    requestPin(async (transactionPin) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/dashboard/profit/tax/${request.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            txHash: trimmedHash || undefined,
            proofNote: proofNote.trim() || undefined,
            proofImage,
            paymentMethod: "BITCOIN",
            transactionPin,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t("investments.profitTax.payFailed"));
        toast.success(json.message);
        clearProofImage();
        router.push(overviewUrl);
        onRefresh();
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (!canPayExternal || submitted || paid) return null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => router.push(overviewUrl)}
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        {t("investments.profitTax.backToOverview")}
      </button>

      <div>
        <span className="wc-progress-pill wc-progress-pill-active inline-flex mb-3">
          <Wallet size={11} />
          {flowStep === 1 ? t("investments.profitTax.paymentBadge") : t("investments.profitTax.step2Title")}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {flowStep === 1 ? t("investments.profitTax.paymentTitle") : t("investments.profitTax.step2Title")}
        </h1>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {flowStep === 1
            ? t("investments.profitTax.paymentSubtitle", { amount: formatCurrency(taxAmount) })
            : t("investments.profitTax.step2Subtitle")}
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="wc-modal-header px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              t("investments.profitTax.payStep1"),
              t("investments.profitTax.payStep2"),
              t("investments.profitTax.payStep3"),
            ].map((label, i) => (
              <span
                key={label}
                className={`wc-progress-pill flex-1 min-w-[5.5rem] justify-center ${
                  i < (flowStep === 1 ? 1 : 2) ? "wc-progress-pill-active" : ""
                }`}
              >
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {flowStep === 1 && (
            <>
              <div className="wc-fee-card px-5 py-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">
                  {t("investments.profitTax.taxDue")}
                </p>
                <p className="wc-fee-amount text-3xl font-bold mt-1">{formatCurrency(taxAmount)}</p>
                <p className="text-xs text-text-muted mt-1 font-mono">{request.referenceId}</p>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {paymentMethods.depositInstructions || t("investments.profitTax.defaultInstructions")}
              </p>

              {paymentMethods.bitcoinWalletAddress ? (
                <div className="wc-wallet-panel p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={16} className="text-accent-brand" />
                    <p className="text-sm font-medium text-text-primary">
                      {t("investments.profitTax.walletLabel")}
                    </p>
                  </div>
                  {paymentMethods.qrCodeDataUrl && (
                    <div className="flex justify-center mb-3 p-2 rounded-xl bg-white">
                      <Image
                        src={paymentMethods.qrCodeDataUrl}
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
                      {paymentMethods.bitcoinWalletAddress}
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
                  {paymentMethods.bitcoinPurchaseLink && (
                    <Link
                      href={paymentMethods.bitcoinPurchaseLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-xs text-accent-brand hover:underline font-medium"
                    >
                      {t("investments.profitTax.buyBitcoin")}
                      <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-amber-400 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  {t("investments.profitTax.walletMissing")}
                </p>
              )}

              <AlternativePaymentMethods
                supportPrefill={t("investments.profitTax.altPayPrefill", {
                  amount: formatCurrency(taxAmount),
                  reference: request.referenceId,
                })}
              />

              <Button type="button" className="w-full gap-2" onClick={() => setFlowStep(2)}>
                {t("investments.profitTax.continueToProof")}
                <ArrowRight size={16} />
              </Button>

              <div className="flex flex-wrap gap-3 justify-center pt-1">
                {[
                  { icon: Lock, label: t("investments.profitTax.trustSecure") },
                  { icon: Shield, label: t("investments.profitTax.trustVerified") },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Icon size={12} className="text-blue-400/80" />
                    {label}
                  </span>
                ))}
              </div>
            </>
          )}

          {flowStep === 2 && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("investments.profitTax.taxDue")}
                  </p>
                  <p className="font-semibold text-white mt-0.5">{formatCurrency(taxAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t("investments.profitTax.reference")}
                  </p>
                  <p className="font-mono text-xs text-white mt-0.5">{request.referenceId}</p>
                </div>
              </div>

              <form onSubmit={submitProof} className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    {t("investments.profitTax.proofImageLabel")}{" "}
                    <span className="text-accent-red">*</span>
                  </label>
                  <p className="text-xs text-text-muted mb-2">{t("investments.profitTax.proofImageHint")}</p>
                  {proofImage ? (
                    <div className="relative rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 rounded-lg overflow-hidden bg-bg-primary shrink-0 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proofImage} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate flex items-center gap-1.5">
                            <ImageIcon size={14} className="text-accent-brand shrink-0" />
                            {proofFileName || t("investments.profitTax.proofImageLabel")}
                          </p>
                          <p className="text-xs text-accent-green mt-0.5">
                            {t("investments.profitTax.proofImageUploaded")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearProofImage}
                          className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                          aria-label="Remove image"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="block border border-dashed border-white/15 rounded-xl p-4 hover:border-accent-brand/40 transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleProofImageChange}
                        required
                      />
                      <div className="flex items-center gap-2 text-text-muted text-sm">
                        <Upload size={16} />
                        <span>{t("investments.profitTax.proofImageHint")}</span>
                      </div>
                    </label>
                  )}
                </div>
                <Input
                  label={t("investments.profitTax.txHashLabel")}
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={t("investments.profitTax.txHashPlaceholder")}
                />
                <Input
                  label={t("investments.profitTax.noteLabel")}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder={t("investments.profitTax.notePlaceholder")}
                />
                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={submitting || pinLoading || !proofImage}
                >
                  {submitting ? t("common.processing") : t("investments.profitTax.submitProof")}
                  {!submitting && <FileCheck size={16} />}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setFlowStep(1)}
                className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={14} />
                {t("investments.profitTax.backToPayment")}
              </button>
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
