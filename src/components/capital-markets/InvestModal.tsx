"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { translateApiErrorMessage } from "@/lib/i18n/api-i18n";
import { calculateInvestmentFee } from "@/lib/market-assets";
import Button from "@/components/ui/Button";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import StockIcon from "@/components/capital-markets/StockIcon";
import type { MarketAssetCardData } from "@/components/capital-markets/MarketAssetCard";

type Step = "amount" | "summary" | "success";

interface InvestModalProps {
  asset: MarketAssetCardData | null;
  walletBalance: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function InvestModal({ asset, walletBalance, open, onClose, onSuccess }: InvestModalProps) {
  const { t, formatCurrency, formatDate } = useI18n();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ orderId: string; shares: number; totalCost: number } | null>(null);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  useEffect(() => {
    if (!open) {
      setStep("amount");
      setAmount("");
      setError("");
      setSubmitting(false);
      setResult(null);
    }
  }, [open, asset?.symbol]);

  const amountNum = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const fee = useMemo(() => (amountNum > 0 ? calculateInvestmentFee(amountNum) : 0), [amountNum]);
  const totalCost = useMemo(() => Math.round((amountNum + fee) * 100) / 100, [amountNum, fee]);
  const shares = useMemo(() => {
    if (!asset || amountNum <= 0) return 0;
    return Math.round((amountNum / asset.price) * 1_000_000) / 1_000_000;
  }, [asset, amountNum]);

  const validateAmount = (): string | null => {
    if (!amount.trim() || amountNum <= 0) return t("invest.amountRequired");
    if (!asset) return t("invest.assetRequired");
    if (amountNum < asset.minInvestment) {
      return t("invest.minInvestment", { amount: formatCurrency(asset.minInvestment) });
    }
    if (totalCost > walletBalance) return t("invest.insufficientBalance");
    return null;
  };

  const goToSummary = () => {
    const err = validateAmount();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep("summary");
  };

  const confirmInvest = () => {
    if (!asset) return;
    const err = validateAmount();
    if (err) {
      setError(err);
      setStep("amount");
      return;
    }

    requestPin(async (transactionPin) => {
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/dashboard/capital-markets/invest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            symbol: asset.symbol,
            amountUsd: amountNum,
            idempotencyKey: `${asset.symbol}-${amountNum}-${Date.now()}`,
            transactionPin,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(translateApiErrorMessage(json.error || "Investment failed", t));

        setResult({
          orderId: json.investment.orderId,
          shares: json.investment.shares,
          totalCost: json.investment.totalCost,
        });
        setStep("success");
        onSuccess();
      } catch (e) {
        throw e instanceof Error ? e : new Error(t("invest.failed"));
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (!asset) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invest-modal-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div className="flex items-center gap-3 min-w-0">
                <StockIcon symbol={asset.symbol} name={asset.name} logoDomain={asset.logoDomain} size="md" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent-brand">{t("invest.title")}</p>
                  <h2 id="invest-modal-title" className="text-lg font-bold text-[var(--text-primary)] truncate">
                    {asset.name}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-[var(--text-muted)] transition-colors"
                aria-label={t("invest.close")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t("invest.ticker")}</p>
                  <p className="font-mono font-bold text-[var(--text-primary)]">{asset.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t("invest.currentPrice")}</p>
                  <p className="font-mono font-bold text-[var(--text-primary)]">{formatCurrency(asset.price)}</p>
                </div>
                <div className="col-span-2 flex items-center gap-2 pt-1 border-t border-[var(--border-subtle)]">
                  <Wallet size={16} className="text-accent-brand" />
                  <span className="text-sm text-[var(--text-secondary)]">{t("invest.walletBalance")}</span>
                  <span className="ml-auto font-mono font-semibold text-[var(--text-primary)]">
                    {formatCurrency(walletBalance)}
                  </span>
                </div>
              </div>

              {step === "amount" && (
                <>
                  <div>
                    <label htmlFor="invest-amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      {t("invest.amountLabel")}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono">$</span>
                      <input
                        id="invest-amount"
                        type="number"
                        min={asset.minInvestment}
                        step="0.01"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setError("");
                        }}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-accent-brand/40"
                      />
                    </div>
                    {error && <p className="text-sm text-accent-red mt-2">{error}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(String(q))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                          amount === String(q)
                            ? "border-accent-brand bg-accent-brand/15 text-accent-brand"
                            : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent-brand/40"
                        )}
                      >
                        {formatCurrency(q)}
                      </button>
                    ))}
                  </div>

                  <Button className="w-full" onClick={goToSummary}>
                    {t("invest.continue")} <ArrowRight size={16} className="ml-1" />
                  </Button>
                </>
              )}

              {step === "summary" && (
                <>
                  <div className="space-y-3 p-4 rounded-xl border border-accent-brand/20 bg-accent-brand/5">
                    <h3 className="font-semibold text-[var(--text-primary)]">{t("invest.summaryTitle")}</h3>
                    {[
                      [t("invest.assetLabel"), `${asset.name} (${asset.symbol})`],
                      [t("invest.amountSummary"), formatCurrency(amountNum)],
                      [t("invest.expectedReturn"), t("invest.annually", { percent: asset.expectedReturnPercent })],
                      [t("invest.estShares"), shares.toFixed(6)],
                      [t("invest.date"), formatDate(new Date(), { dateStyle: "medium" })],
                      [t("invest.transactionFee"), formatCurrency(fee)],
                      [t("invest.totalCost"), formatCurrency(totalCost)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm gap-4">
                        <span className="text-[var(--text-muted)]">{label}</span>
                        <span className="font-medium text-[var(--text-primary)] text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                  {error && <p className="text-sm text-accent-red">{error}</p>}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("amount")} disabled={submitting}>
                      {t("invest.back")}
                    </Button>
                    <Button className="flex-1" onClick={confirmInvest} isLoading={submitting}>
                      {t("invest.confirm")}
                    </Button>
                  </div>
                </>
              )}

              {step === "success" && result && (
                <div className="text-center py-4 space-y-4">
                  <CheckCircle2 size={48} className="mx-auto text-accent-green" />
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{t("invest.successTitle")}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                      {t("invest.successDesc", {
                        shares: result.shares.toFixed(4),
                        symbol: asset.symbol,
                        total: formatCurrency(result.totalCost),
                      })}
                    </p>
                  </div>
                  <Button className="w-full" onClick={onClose}>
                    {t("invest.done")}
                  </Button>
                </div>
              )}

              {submitting && step === "summary" && (
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  {t("invest.processing")}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || submitting}
        error={pinError}
      />
    </AnimatePresence>
  );
}
