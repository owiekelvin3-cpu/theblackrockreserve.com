"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "framer-motion";
import { X, Wallet, ArrowRight, CheckCircle2, Loader2, CalendarClock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { translateApiErrorMessage } from "@/lib/i18n/api-error-messages";
import { calculateInvestmentFee } from "@/lib/market-assets";
import {
  calculateHoldReturn,
  findDurationPlan,
  getEnabledDurationPlans,
  maturityDateFromDays,
} from "@/lib/market-duration";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
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
  initialDurationId?: string;
  onClose: () => void;
  onSuccess: (symbol: string) => void;
  onClosePosition?: (symbol: string) => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function InvestModal({
  asset,
  walletBalance,
  open,
  initialDurationId,
  onClose,
  onSuccess,
  onClosePosition,
}: InvestModalProps) {
  const { t, formatCurrency, formatDate, currencySymbol } = useI18n();
  const reduced = useReducedMotion();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [durationId, setDurationId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    orderId: string;
    shares: number;
    totalCost: number;
    projectedReturnUsd: number | null;
    durationLabel: string | null;
  } | null>(null);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const durationPlans = useMemo(
    () => (asset ? getEnabledDurationPlans(asset) : []),
    [asset]
  );

  useEffect(() => {
    if (!open) {
      setStep("amount");
      setAmount("");
      setError("");
      setSubmitting(false);
      setResult(null);
      setDurationId("");
      return;
    }
    if (!asset) return;
    const selected = findDurationPlan(asset, initialDurationId);
    setDurationId(selected?.id ?? "");
    // Keep duration stable while the same asset is open (marketplace polling refreshes the object).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset?.symbol, initialDurationId]);

  const amountNum = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const selectedPlan = useMemo(
    () => durationPlans.find((plan) => plan.id === durationId) ?? durationPlans[0] ?? null,
    [durationPlans, durationId]
  );

  const previewAmount = amountNum > 0 ? amountNum : asset?.minInvestment ?? 0;
  const holdReturn = useMemo(
    () => calculateHoldReturn(previewAmount, selectedPlan?.returnPercent ?? 0),
    [previewAmount, selectedPlan?.returnPercent]
  );
  const maturityDate = useMemo(
    () => (selectedPlan ? maturityDateFromDays(selectedPlan.days) : null),
    [selectedPlan]
  );

  const fee = useMemo(() => (amountNum > 0 ? calculateInvestmentFee(amountNum) : 0), [amountNum]);
  const totalCost = useMemo(() => Math.round((amountNum + fee) * 100) / 100, [amountNum, fee]);
  const animatedProfit = useAnimatedNumber(holdReturn.profit);
  const animatedPayout = useAnimatedNumber(holdReturn.payout);
  const shares = useMemo(() => {
    if (!asset || amountNum <= 0) return 0;
    return Math.round((amountNum / asset.price) * 1_000_000) / 1_000_000;
  }, [asset, amountNum]);

  const validateAmount = (): string | null => {
    if (!amount.trim() || amountNum <= 0) return t("invest.amountRequired");
    if (!asset) return t("invest.assetRequired");
    if (!selectedPlan) return t("invest.durationRequired");
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
    if (!asset || !selectedPlan) return;
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
            durationPlanId: selectedPlan.id,
            idempotencyKey: `${asset.symbol}-${amountNum}-${selectedPlan.id}-${Date.now()}`,
            transactionPin,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(translateApiErrorMessage(json.error || "Investment failed", t));

        setResult({
          orderId: json.investment.orderId,
          shares: json.investment.shares,
          totalCost: json.investment.totalCost,
          projectedReturnUsd: json.investment.projectedReturnUsd ?? holdReturn.profit,
          durationLabel: json.investment.durationLabel ?? selectedPlan.label,
        });
        setStep("success");
        onSuccess(asset.symbol);
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
                <StockIcon symbol={asset.symbol} name={asset.name} logoDomain={asset.logoDomain} logoUrl={asset.logoUrl} size="md" />
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
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--surface-base)] border border-[var(--border-subtle)]"
              >
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
              </motion.div>

              <AnimatePresence mode="wait">
              {step === "amount" && (
                <motion.div
                  key="amount"
                  initial={reduced ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? undefined : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5"
                >
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                      {t("invest.durationLabel")}
                    </label>
                    <p className="text-xs text-[var(--text-muted)] mb-3">{t("invest.durationHint")}</p>
                    <div className="flex flex-wrap gap-2">
                      <LayoutGroup>
                      {durationPlans.map((plan) => (
                        <motion.button
                          key={plan.id}
                          type="button"
                          onClick={() => {
                            setDurationId(plan.id);
                            setError("");
                          }}
                          whileHover={reduced ? undefined : { y: -2, scale: 1.03 }}
                          whileTap={reduced ? undefined : { scale: 0.96 }}
                          className={cn(
                            "relative px-3 py-2 rounded-xl text-xs font-semibold border min-w-[88px] overflow-hidden",
                            durationId === plan.id
                              ? "text-accent-brand border-transparent"
                              : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent-brand/40"
                          )}
                        >
                          {durationId === plan.id && (
                            <motion.span
                              layoutId="invest-duration-pill"
                              className="absolute inset-0 rounded-xl bg-accent-brand/15 border border-accent-brand"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            />
                          )}
                          <span className="relative z-10 block">{plan.label}</span>
                          <span className="relative z-10 block mt-0.5 font-mono text-[11px] opacity-80">
                            {plan.returnPercent >= 0 ? "+" : ""}
                            {plan.returnPercent.toFixed(2)}%
                          </span>
                        </motion.button>
                      ))}
                      </LayoutGroup>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="invest-amount" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      {t("invest.amountLabel")}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono">{currencySymbol}</span>
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
                      <motion.button
                        key={q}
                        type="button"
                        onClick={() => setAmount(String(q))}
                        whileTap={reduced ? undefined : { scale: 0.94 }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                          amount === String(q)
                            ? "border-accent-brand bg-accent-brand/15 text-accent-brand"
                            : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-accent-brand/40"
                        )}
                      >
                        {formatCurrency(q)}
                      </motion.button>
                    ))}
                  </div>

                  {selectedPlan && previewAmount > 0 && (
                    <motion.div
                      key={selectedPlan.id}
                      initial={reduced ? false : { opacity: 0.55, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 320, damping: 28 }}
                      className="market-return-preview rounded-xl border border-accent-brand/25 bg-accent-brand/10 p-4 space-y-3"
                    >
                      <div className="relative z-10 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{t("invest.projectedReturn")}</p>
                          <p className="text-2xl font-bold font-mono text-accent-green mt-0.5">
                            +{formatCurrency(animatedProfit)}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {t("invest.youWillMake", { amount: formatCurrency(animatedProfit) })}{" "}
                            {t("invest.inDuration", { duration: selectedPlan.label })}
                          </p>
                        </div>
                        <motion.span
                          animate={reduced ? undefined : { y: [0, -3, 0] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-accent-green/10 text-accent-green"
                        >
                          <TrendingUp size={12} />
                          {selectedPlan.returnPercent.toFixed(2)}%
                        </motion.span>
                      </div>
                      <div className="relative z-10 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.span
                          className="block h-full rounded-full bg-gradient-to-r from-accent-brand to-accent-green"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (selectedPlan.days / 365) * 100)}%` }}
                          transition={{ duration: reduced ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <div className="relative z-10 grid grid-cols-2 gap-3 pt-2 border-t border-accent-brand/15 text-sm">
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">{t("invest.projectedPayout")}</p>
                          <p className="font-mono font-semibold text-[var(--text-primary)]">{formatCurrency(animatedPayout)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-muted)]">{t("invest.maturityDate")}</p>
                          <p className="font-medium text-[var(--text-primary)] inline-flex items-center gap-1">
                            <CalendarClock size={13} className="text-accent-brand" />
                            {maturityDate ? formatDate(maturityDate, { dateStyle: "medium" }) : "—"}
                          </p>
                        </div>
                      </div>
                      {amountNum <= 0 && (
                        <p className="relative z-10 text-[11px] text-[var(--text-muted)]">
                          {t("invest.exampleOn", { amount: formatCurrency(previewAmount) })}
                        </p>
                      )}
                      <p className="relative z-10 text-[11px] text-[var(--text-muted)]">{t("invest.projectedNote")}</p>
                    </motion.div>
                  )}

                  <Button className="w-full" onClick={goToSummary}>
                    {t("invest.continue")} <ArrowRight size={16} className="ml-1" />
                  </Button>
                </motion.div>
              )}

              {step === "summary" && selectedPlan && (
                <motion.div
                  key="summary"
                  initial={reduced ? false : { opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduced ? undefined : { opacity: 0, x: -18 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5"
                >
                  <div className="space-y-3 p-4 rounded-xl border border-accent-brand/20 bg-accent-brand/5">
                    <h3 className="font-semibold text-[var(--text-primary)]">{t("invest.summaryTitle")}</h3>
                    {[
                      [t("invest.assetLabel"), `${asset.name} (${asset.symbol})`],
                      [t("invest.amountSummary"), formatCurrency(amountNum)],
                      [t("invest.durationSummary"), selectedPlan.label],
                      [t("invest.returnRate"), `${selectedPlan.returnPercent.toFixed(2)}%`],
                      [t("invest.estProfitSummary"), `+${formatCurrency(holdReturn.profit)}`],
                      [t("invest.estPayoutSummary", { duration: selectedPlan.label }), formatCurrency(holdReturn.payout)],
                      [t("invest.maturityDate"), maturityDate ? formatDate(maturityDate, { dateStyle: "medium" }) : "—"],
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
                </motion.div>
              )}

              {step === "success" && result && (
                <motion.div
                  key="success"
                  initial={reduced ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4 space-y-4"
                >
                  <div className="relative mx-auto h-16 w-16">
                    {!reduced &&
                      [0, 1, 2, 3, 4, 5].map((i) => (
                        <motion.span
                          key={i}
                          className="invest-success-burst"
                          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                          animate={{
                            opacity: 0,
                            x: Math.cos((i / 6) * Math.PI * 2) * 28,
                            y: Math.sin((i / 6) * Math.PI * 2) * 28,
                            scale: 0.3,
                          }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                        />
                      ))}
                    <motion.div
                      initial={reduced ? false : { scale: 0, rotate: -24 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 280, damping: 14 }}
                    >
                      <CheckCircle2 size={48} className="mx-auto text-accent-green" />
                    </motion.div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{t("invest.successTitle")}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                      {t("invest.successDesc", {
                        shares: result.shares.toFixed(4),
                        symbol: asset.symbol,
                        total: formatCurrency(result.totalCost),
                      })}
                    </p>
                    {result.projectedReturnUsd != null && result.durationLabel && (
                      <p className="text-sm font-medium text-accent-green mt-2">
                        {t("invest.successReturn", {
                          profit: formatCurrency(result.projectedReturnUsd),
                          duration: result.durationLabel,
                        })}
                      </p>
                    )}
                    <p className="text-xs text-[var(--text-muted)] mt-2">{t("invest.positionReady")}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                      {t("invest.done")}
                    </Button>
                    {onClosePosition && (
                      <Button
                        variant="danger"
                        className="flex-1"
                        onClick={() => {
                          onClosePosition(asset.symbol);
                          onClose();
                        }}
                      >
                        {t("trade.closePosition")}
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

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
