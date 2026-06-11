"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { translateApiErrorMessage } from "@/lib/i18n/api-error-messages";
import { calculateInvestmentFee } from "@/lib/market-assets";
import Button from "@/components/ui/Button";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import StockIcon from "@/components/capital-markets/StockIcon";

type Step = "amount" | "summary" | "success";
type SellMode = "shares" | "usd";

export interface SellHoldingData {
  symbol: string;
  name: string;
  sector: string;
  shares: number;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  logoDomain?: string | null;
  logoUrl?: string | null;
  minSaleUsd: number;
}

interface SellModalProps {
  holding: SellHoldingData | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_PERCENTAGES = [25, 50, 75, 100];

export default function SellModal({ holding, open, onClose, onSuccess }: SellModalProps) {
  const { t, formatCurrency } = useI18n();
  const [step, setStep] = useState<Step>("amount");
  const [mode, setMode] = useState<SellMode>("usd");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    sharesSold: number;
    netProceeds: number;
    realizedPnl: number;
  } | null>(null);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } =
    useTransactionPin();

  useEffect(() => {
    if (!open) {
      setStep("amount");
      setMode("usd");
      setAmount("");
      setError("");
      setSubmitting(false);
      setResult(null);
    }
  }, [open, holding?.symbol]);

  const amountNum = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const sharesToSell = useMemo(() => {
    if (!holding || amountNum <= 0) return 0;
    if (mode === "shares") return Math.min(amountNum, holding.shares);
    return Math.min(
      Math.round((amountNum / holding.marketPrice) * 1_000_000) / 1_000_000,
      holding.shares
    );
  }, [holding, amountNum, mode]);

  const grossProceeds = useMemo(
    () => (holding && sharesToSell > 0 ? Math.round(sharesToSell * holding.marketPrice * 100) / 100 : 0),
    [holding, sharesToSell]
  );
  const fee = useMemo(() => (grossProceeds > 0 ? calculateInvestmentFee(grossProceeds) : 0), [grossProceeds]);
  const netProceeds = useMemo(() => Math.round((grossProceeds - fee) * 100) / 100, [grossProceeds, fee]);
  const costBasis = useMemo(
    () => (holding && sharesToSell > 0 ? Math.round(sharesToSell * holding.avgPrice * 100) / 100 : 0),
    [holding, sharesToSell]
  );
  const realizedPnl = useMemo(() => Math.round((netProceeds - costBasis) * 100) / 100, [netProceeds, costBasis]);

  const validateAmount = (): string | null => {
    if (!holding) return t("sell.assetRequired");
    if (!amount.trim() || amountNum <= 0) return t("sell.amountRequired");
    if (sharesToSell <= 0) return t("sell.amountTooSmall");
    if (sharesToSell > holding.shares + 0.000001) return t("sell.insufficientShares");
    if (grossProceeds < holding.minSaleUsd) {
      return t("sell.minSale", { amount: formatCurrency(holding.minSaleUsd) });
    }
    return null;
  };

  const applyPercentage = (pct: number) => {
    if (!holding) return;
    const shares = Math.round(holding.shares * (pct / 100) * 1_000_000) / 1_000_000;
    if (mode === "shares") {
      setAmount(String(shares));
    } else {
      setAmount(String(Math.round(shares * holding.marketPrice * 100) / 100));
    }
    setError("");
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

  const confirmSell = () => {
    if (!holding) return;
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
        const body =
          mode === "shares"
            ? { symbol: holding.symbol, shares: sharesToSell, transactionPin }
            : { symbol: holding.symbol, amountUsd: amountNum, transactionPin };

        const res = await fetch("/api/dashboard/capital-markets/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(translateApiErrorMessage(json.error || "Sale failed", t));

        setResult({
          sharesSold: json.sale.sharesSold,
          netProceeds: json.sale.netProceeds,
          realizedPnl: json.sale.realizedPnl,
        });
        setStep("success");
        onSuccess();
      } catch (e) {
        throw e instanceof Error ? e : new Error(t("sell.failed"));
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (!holding) return null;

  const positivePnl = realizedPnl >= 0;

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
            aria-labelledby="sell-modal-title"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              <div className="flex items-center gap-3 min-w-0">
                <StockIcon
                  symbol={holding.symbol}
                  name={holding.name}
                  logoDomain={holding.logoDomain}
                  logoUrl={holding.logoUrl}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent-brand">{t("sell.title")}</p>
                  <h2 id="sell-modal-title" className="text-lg font-bold text-[var(--text-primary)] truncate">
                    {holding.name}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-[var(--text-muted)] transition-colors"
                aria-label={t("sell.close")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t("sell.holdingShares")}</p>
                  <p className="font-mono font-bold text-[var(--text-primary)]">{holding.shares.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t("sell.marketValue")}</p>
                  <p className="font-mono font-bold text-[var(--text-primary)]">{formatCurrency(holding.marketValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t("sell.avgCost")}</p>
                  <p className="font-mono text-sm text-[var(--text-secondary)]">{formatCurrency(holding.avgPrice)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)]">{t("sell.unrealizedPl")}</p>
                  <p
                    className={cn(
                      "font-mono text-sm font-semibold inline-flex items-center gap-1",
                      holding.gainLoss >= 0 ? "text-accent-green" : "text-accent-red"
                    )}
                  >
                    {holding.gainLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {holding.gainLoss >= 0 ? "+" : ""}
                    {formatCurrency(holding.gainLoss)}
                  </p>
                </div>
              </div>

              {step === "amount" && (
                <>
                  <div className="flex gap-2 p-1 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]">
                    {(["usd", "shares"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMode(m);
                          setAmount("");
                          setError("");
                        }}
                        className={cn(
                          "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                          mode === m
                            ? "bg-accent-brand/15 text-accent-brand"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {m === "usd" ? t("sell.modeUsd") : t("sell.modeShares")}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label htmlFor="sell-amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      {mode === "usd" ? t("sell.amountUsdLabel") : t("sell.amountSharesLabel")}
                    </label>
                    <div className="relative">
                      {mode === "usd" && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono">$</span>
                      )}
                      <input
                        id="sell-amount"
                        type="number"
                        min={0}
                        step={mode === "usd" ? "0.01" : "0.0001"}
                        max={mode === "shares" ? holding.shares : holding.marketValue}
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setError("");
                        }}
                        placeholder={mode === "usd" ? "0.00" : "0.0000"}
                        className={cn(
                          "w-full pr-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] text-[var(--text-primary)] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-accent-brand/40",
                          mode === "usd" ? "pl-8" : "pl-4"
                        )}
                      />
                    </div>
                    {sharesToSell > 0 && mode === "usd" && (
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        {t("sell.estShares", { shares: sharesToSell.toFixed(4) })}
                      </p>
                    )}
                    {error && <p className="text-sm text-accent-red mt-2">{error}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUICK_PERCENTAGES.map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyPercentage(pct)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent-brand/40 transition-colors"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <Button className="w-full" onClick={goToSummary}>
                    {t("sell.continue")} <ArrowRight size={16} className="ml-1" />
                  </Button>
                </>
              )}

              {step === "summary" && (
                <>
                  <div className="space-y-3 p-4 rounded-xl border border-accent-brand/20 bg-accent-brand/5">
                    <h3 className="font-semibold text-[var(--text-primary)]">{t("sell.summaryTitle")}</h3>
                    {[
                      [t("sell.assetLabel"), `${holding.name} (${holding.symbol})`],
                      [t("sell.sharesSold"), sharesToSell.toFixed(6)],
                      [t("sell.salePrice"), formatCurrency(holding.marketPrice)],
                      [t("sell.grossProceeds"), formatCurrency(grossProceeds)],
                      [t("sell.transactionFee"), formatCurrency(fee)],
                      [t("sell.netProceeds"), formatCurrency(netProceeds)],
                      [t("sell.costBasis"), formatCurrency(costBasis)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm gap-4">
                        <span className="text-[var(--text-muted)]">{label}</span>
                        <span className="font-medium text-[var(--text-primary)] text-right">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm gap-4 pt-2 border-t border-accent-brand/20">
                      <span className="text-[var(--text-muted)]">{t("sell.realizedPl")}</span>
                      <span
                        className={cn(
                          "font-semibold text-right",
                          positivePnl ? "text-accent-green" : "text-accent-red"
                        )}
                      >
                        {positivePnl ? "+" : ""}
                        {formatCurrency(realizedPnl)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">{t("sell.profitNote")}</p>
                  {error && <p className="text-sm text-accent-red">{error}</p>}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setStep("amount")} disabled={submitting}>
                      {t("sell.back")}
                    </Button>
                    <Button className="flex-1" onClick={confirmSell} isLoading={submitting}>
                      {t("sell.confirm")}
                    </Button>
                  </div>
                </>
              )}

              {step === "success" && result && (
                <div className="text-center py-4 space-y-4">
                  <CheckCircle2 size={48} className="mx-auto text-accent-green" />
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{t("sell.successTitle")}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                      {t("sell.successDesc", {
                        shares: result.sharesSold.toFixed(4),
                        symbol: holding.symbol,
                        proceeds: formatCurrency(result.netProceeds),
                      })}
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold mt-2",
                        result.realizedPnl >= 0 ? "text-accent-green" : "text-accent-red"
                      )}
                    >
                      {t("sell.successPnl", {
                        amount: `${result.realizedPnl >= 0 ? "+" : ""}${formatCurrency(result.realizedPnl)}`,
                      })}
                    </p>
                  </div>
                  <Button className="w-full" onClick={onClose}>
                    {t("sell.done")}
                  </Button>
                </div>
              )}

              {submitting && step === "summary" && (
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
                  <Loader2 size={16} className="animate-spin" />
                  {t("sell.processing")}
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
