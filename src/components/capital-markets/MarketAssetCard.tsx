"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Shield, Clock } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StockIcon from "@/components/capital-markets/StockIcon";

export interface MarketAssetCardData {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  description: string;
  logoUrl: string | null;
  logoDomain?: string | null;
  price: number;
  change: number;
  changePercent: number;
  minInvestment: number;
  riskRating: string;
  expectedReturnPercent: number;
  marketCapRank?: number;
  popularity?: number;
}

interface MarketAssetCardProps {
  asset: MarketAssetCardData;
  marketStatus: string;
  onInvest: (asset: MarketAssetCardData) => void;
  index?: number;
}

function riskColor(risk: string) {
  if (risk === "Low") return "text-accent-green border-accent-green/30 bg-accent-green/10";
  if (risk === "High") return "text-accent-red border-accent-red/30 bg-accent-red/10";
  return "text-amber-400 border-amber-400/30 bg-amber-400/10";
}

export default function MarketAssetCard({ asset, marketStatus, onInvest, index = 0 }: MarketAssetCardProps) {
  const positive = asset.changePercent >= 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -4 }}
      className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-sm hover:shadow-lg hover:border-accent-brand/25 transition-all duration-300 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent-brand/0 via-transparent to-accent-brand/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <StockIcon symbol={asset.symbol} name={asset.name} logoDomain={asset.logoDomain} size="md" />
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--text-primary)] truncate">{asset.name}</h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <Badge variant="gold">{asset.symbol}</Badge>
              <span className="text-xs text-[var(--text-muted)]">{asset.sector}</span>
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

      <div className="relative grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-0.5">Current Price</p>
          <p className="font-mono text-lg font-bold text-[var(--text-primary)]">{formatCurrency(asset.price)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-0.5">Day Change</p>
          <p className={cn("font-mono text-sm font-semibold", positive ? "text-accent-green" : "text-accent-red")}>
            {positive ? "+" : ""}
            {formatCurrency(asset.change)}
          </p>
        </div>
      </div>

      <p className="relative text-xs text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
        {asset.description}
      </p>

      <div className="relative flex flex-wrap items-center gap-2 mb-4">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border", riskColor(asset.riskRating))}>
          <Shield size={10} className="inline mr-1 -mt-0.5" />
          {asset.riskRating} Risk
        </span>
        <span className="text-[10px] text-[var(--text-muted)] px-2 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)]">
          Min {formatCurrency(asset.minInvestment)}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] px-2 py-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] inline-flex items-center gap-1">
          <Clock size={10} />
          {marketStatus}
        </span>
      </div>

      <div className="relative flex items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Expected Return</p>
          <p className="text-sm font-semibold text-accent-brand">~{asset.expectedReturnPercent}% p.a.</p>
        </div>
        <Button size="sm" onClick={() => onInvest(asset)} className="shrink-0">
          Invest
        </Button>
      </div>
    </motion.article>
  );
}
