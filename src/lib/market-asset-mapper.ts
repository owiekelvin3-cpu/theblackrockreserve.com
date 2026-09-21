import type { MarketAsset } from "@prisma/client";
import {
  getDurationPlans,
  planIdForReturnPeriod,
  type MarketDurationPlan,
  type ReturnPeriodKey,
} from "@/lib/market-duration";

export type { MarketDurationPlan, ReturnPeriodKey };

export type MarketAssetRecord = {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  description: string;
  logoDomain: string | null;
  logoUrl: string | null;
  price: number;
  changePercent: number;
  change: number;
  minInvestment: number;
  riskRating: string;
  expectedReturnPercent: number;
  growthRate: number;
  return7d: number;
  return14d: number;
  return30d: number;
  return90d: number;
  return1y: number;
  returnWeekly: number;
  returnMonthly: number;
  returnYearly: number;
  customReturnLabel: string | null;
  customReturnPercent: number | null;
  durationPlans: MarketDurationPlan[];
  marketCapRank: number;
  popularity: number;
  sortOrder: number;
  isFeatured: boolean;
  isPinned: boolean;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function clearbitFromDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}`;
}

export function mapMarketAsset(asset: MarketAsset): MarketAssetRecord {
  const price = Number(asset.price);
  const changePercent = Number(asset.changePercent);
  const change = Math.round(price * (changePercent / 100) * 100) / 100;

  const recordBase = {
    expectedReturnPercent: Number(asset.expectedReturnPercent),
    return7d: Number(asset.return7d),
    return14d: Number(asset.return14d),
    return30d: Number(asset.return30d),
    return90d: Number(asset.return90d),
    return1y: Number(asset.return1y),
    returnWeekly: Number(asset.returnWeekly),
    returnMonthly: Number(asset.returnMonthly),
    returnYearly: Number(asset.returnYearly),
    customReturnLabel: asset.customReturnLabel,
    customReturnPercent: asset.customReturnPercent != null ? Number(asset.customReturnPercent) : null,
    durationPlans: asset.durationPlans,
  };

  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    sector: asset.sector,
    description: asset.description,
    logoDomain: asset.logoDomain,
    logoUrl: asset.logoUrl ?? clearbitFromDomain(asset.logoDomain),
    price,
    change,
    changePercent,
    minInvestment: Number(asset.minInvestment),
    riskRating: asset.riskRating,
    growthRate: Number(asset.growthRate),
    ...recordBase,
    durationPlans: getDurationPlans(recordBase),
    marketCapRank: asset.marketCapRank,
    popularity: asset.popularity,
    sortOrder: asset.sortOrder,
    isFeatured: asset.isFeatured,
    isPinned: asset.isPinned,
    enabled: asset.enabled,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export function getReturnForPeriod(asset: MarketAssetRecord, period: ReturnPeriodKey): number {
  const planId = planIdForReturnPeriod(period);
  const fromPlan = asset.durationPlans.find((plan) => plan.id === planId && plan.enabled);
  if (fromPlan) return fromPlan.returnPercent;

  switch (period) {
    case "7d":
      return asset.return7d;
    case "14d":
      return asset.return14d;
    case "30d":
      return asset.return30d;
    case "90d":
      return asset.return90d;
    case "1y":
      return asset.return1y;
    case "weekly":
      return asset.returnWeekly;
    case "monthly":
      return asset.returnMonthly;
    case "yearly":
      return asset.returnYearly;
    case "custom":
      return asset.customReturnPercent ?? asset.expectedReturnPercent;
    default:
      return asset.expectedReturnPercent;
  }
}
