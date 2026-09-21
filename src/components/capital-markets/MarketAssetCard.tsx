"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Shield, Clock, Pin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StockIcon from "@/components/capital-markets/StockIcon";
import type { MarketAssetRecord, ReturnPeriodKey } from "@/lib/market-asset-mapper";
import { getReturnForPeriod } from "@/lib/market-asset-mapper";
import {
  calculateHoldReturn,
  examplePurchaseAmount,
  getEnabledDurationPlans,
  planIdForReturnPeriod,
} from "@/lib/market-duration";
import { useI18n } from "@/components/providers/I18nProvider";

export type MarketAssetCardData = MarketAssetRecord;

export type OwnedHoldingSummary = {
  shares: number;
  marketValue: number;
  gainLossPercent: number;
};

interface MarketAssetCardProps {
  asset: MarketAssetCardData;
  marketStatus: string;
  returnPeriod?: ReturnPeriodKey;
  onInvest: (asset: MarketAssetCardData, durationPlanId?: string) => void;
  onSell?: (asset: MarketAssetCardData) => void;
  holding?: OwnedHoldingSummary | null;
  index?: number;
}

function riskColor(risk: string) {
  if (risk === "Low") return "text-accent-green border-accent-green/30 bg-accent-green/10";
  if (risk === "High") return "text-accent-red border-accent-red/30 bg-accent-red/10";
  return "market-risk-medium";
}

export default function MarketAssetCard({
  asset,
  marketStatus,
  returnPeriod = "30d",
  onInvest,
  onSell,
  holding,
  index = 0,
}: MarketAssetCardProps) {
  const { t, formatCurrency } = useI18n();
  const positive = asset.changePercent >= 0;
  const periodReturn = getReturnForPeriod(asset, returnPeriod);
  const periodPositive = periodReturn >= 0;
  const durationPlans = getEnabledDurationPlans(asset).slice(0, 5);
  const highlightedPlanId = planIdForReturnPeriod(returnPeriod);
  const exampleAmount = examplePurchaseAmount(asset.minInvestment);
  const highlightPlan =
    durationPlans.find((plan) => plan.id === highlightedPlanId) ?? durationPlans[0] ?? null;
  const exampleReturn = highlightPlan
    ? calculateHoldReturn(exampleAmount, highlightPlan.returnPercent)
    : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -4 }}
      className={cn(
        "market-asset-card group relative rounded-2xl p-5 hover:border-accent-brand/25 transition-all duration-300 overflow-hidden",
        asset.isPinned && "ring-1 ring-accent-brand/40",
        asset.isFeatured && "border-amber-500/20"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent-brand/0 via-transparent to-accent-brand/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {(asset.isPinned || asset.isFeatured) && (
        <div className="absolute top-3 right-3 flex gap-1 z-10">
          {asset.isPinned && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-accent-brand/20 text-accent-brand border border-accent-brand/30">
              <Pin size={9} /> Pinned
            </span>
          )}
          {asset.isFeatured && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <Star size={9} /> Featured
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <StockIcon symbol={asset.symbol} name={asset.name} logoDomain={asset.logoDomain} logoUrl={asset.logoUrl} size="md" />
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{asset.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="gold">{asset.symbol}</Badge>
              <span className="text-xs text-[var(--text-muted)]">{asset.sector}</span>
              {holding && (
                <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/25">
                  {t("trade.owned")}
                </span>
              )}
            </div>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full shrink-0",
            positive ? "text-accent-green bg-accent-green/10" : "text-accent-red bg-accent-red/10"
          )}
        >
          {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {positive ? "+" : ""}
          {asset.changePercent.toFixed(2)}%
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-0.5">Current Price</p>
          <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{formatCurrency(asset.price)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-0.5">{t("capitalMarkets.projectedReturn")}</p>
          <p className={cn("font-mono text-sm font-semibold", periodPositive ? "text-accent-green" : "text-accent-red")}>
            {periodPositive ? "+" : ""}
            {periodReturn.toFixed(2)}%
          </p>
        </div>
      </div>

      <p className="relative text-xs text-[var(--text-secondary)] line-clamp-3 mb-3 leading-relaxed">
        {asset.description}
      </p>

      {durationPlans.length > 0 && (
        <div className="relative mb-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)]/60 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{t("capitalMarkets.durationReturns")}</p>
            {exampleReturn && highlightPlan && (
              <p className="text-[10px] text-accent-green font-semibold">
                {t("capitalMarkets.youMake", { profit: formatCurrency(exampleReturn.profit) })}{" "}
                {t("capitalMarkets.inDuration", { duration: highlightPlan.label })}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {durationPlans.map((plan) => {
              const sample = calculateHoldReturn(exampleAmount, plan.returnPercent);
              const active = plan.id === highlightedPlanId;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onInvest(asset, plan.id)}
                  className={cn(
                    "text-left rounded-lg px-2 py-1.5 border transition-colors",
                    active
                      ? "border-accent-brand/50 bg-accent-brand/10"
                      : "border-transparent hover:border-accent-brand/30 hover:bg-accent-brand/5"
                  )}
                >
                  <p className="text-[10px] text-[var(--text-muted)]">{plan.label}</p>
                  <p className="text-xs font-semibold text-accent-green">
                    {plan.returnPercent >= 0 ? "+" : ""}
                    {plan.returnPercent.toFixed(2)}%
                  </p>
                  <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                    +{formatCurrency(sample.profit)}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-2">
            {t("capitalMarkets.examplePurchase", { amount: formatCurrency(exampleAmount) })}
          </p>
        </div>
      )}

      <div className="relative flex flex-wrap items-center gap-2 mb-4">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border", riskColor(asset.riskRating))}>
          <Shield size={10} className="inline mr-1 -mt-0.5" />
          {asset.riskRating} Risk
        </span>
        <span className="market-asset-chip text-[10px] px-2 py-1 rounded-full">
          Min {formatCurrency(asset.minInvestment)}
        </span>
        <span className="market-asset-chip text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1">
          <Clock size={10} />
          {marketStatus}
        </span>
      </div>

      <div className="relative flex items-end justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <div className="min-w-0">
          {holding ? (
            <>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{t("trade.yourPosition")}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] font-mono">
                {holding.shares.toFixed(4)} shares
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatCurrency(holding.marketValue)}</p>
            </>
          ) : exampleReturn && highlightPlan ? (
            <>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{t("capitalMarkets.estOnAmount", { amount: formatCurrency(exampleAmount) })}</p>
              <p className="text-sm font-semibold text-accent-brand">
                +{formatCurrency(exampleReturn.profit)} · {highlightPlan.label}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Expected Return</p>
              <p className="text-sm font-semibold text-accent-brand">~{asset.expectedReturnPercent}% p.a.</p>
            </>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          {holding && onSell && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSell(asset)}
              className="border-accent-red/30 text-accent-red hover:bg-accent-red/10"
            >
              {t("trade.closePosition")}
            </Button>
          )}
          <Button size="sm" onClick={() => onInvest(asset, highlightPlan?.id)}>
            {holding ? t("trade.buyMore") : t("trade.buy")}
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
