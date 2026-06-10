"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, BarChart3, Wallet, PieChart, Search,
  SlidersHorizontal, LineChart, History, LayoutGrid,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DashboardGate from "@/components/dashboard/DashboardGate";
import ChartContainer from "@/components/ui/ChartContainer";
import MarketAssetCard, { type MarketAssetCardData } from "@/components/capital-markets/MarketAssetCard";
import InvestModal from "@/components/capital-markets/InvestModal";
import StockIcon from "@/components/capital-markets/StockIcon";
import { formatCurrency, cn } from "@/lib/utils";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { CHART_BRAND, CHART_COLORS } from "@/lib/chart-theme";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { SECTOR_FILTERS } from "@/lib/market-assets";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/I18nProvider";

interface Holding {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  logoDomain?: string | null;
  shares: number;
  avgPrice: number;
  costBasis: number;
  marketPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChangePercent: number;
  roiPercent: number;
  investedAt: string;
}

interface HistoryItem {
  id: string;
  symbol: string;
  assetName: string;
  amountUsd: number;
  shares: number;
  fee: number;
  totalCost: number;
  createdAt: string;
}

interface Analytics {
  totalInvested: number;
  currentPortfolioValue: number;
  totalProfit: number;
  totalLoss: number;
  netGainLoss: number;
  netGainLossPercent: number;
  monthlyGrowth: { month: string; invested: number; value: number }[];
  assetAllocation: { sector: string; value: number; percent: number }[];
  portfolioDistribution: { symbol: string; name: string; value: number; percent: number }[];
}

interface CapitalMarketsData {
  portfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  positionsCount: number;
  availableCash: number;
  marketStatus: { status: string; label: string; exchanges: string[] };
  holdings: Holding[];
  assets: MarketAssetCardData[];
  history: HistoryItem[];
  analytics: Analytics;
}

type Tab = "marketplace" | "portfolio" | "analytics";
type SortKey = "popular" | "return" | "return-asc" | "alpha" | "marketcap";

function ChangeBadge({ value, percent }: { value?: number; percent: number }) {
  const positive = percent >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        positive ? "text-accent-green" : "text-accent-red"
      )}
    >
      {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {value != null && `${positive ? "+" : ""}${formatCurrency(value)} · `}
      {positive ? "+" : ""}
      {percent.toFixed(2)}%
    </span>
  );
}

export default function CapitalMarketsPage() {
  const { t } = useI18n();
  const chartTheme = useChartTheme();

  const SECTOR_LABEL_KEYS: Record<string, string> = {
    all: "capitalMarkets.sectorAll",
    Technology: "capitalMarkets.sectorTechnology",
    "Financial Services": "capitalMarkets.sectorFinance",
    Healthcare: "capitalMarkets.sectorHealthcare",
    Energy: "capitalMarkets.sectorEnergy",
    "Consumer & Retail": "capitalMarkets.sectorConsumer",
    Industrial: "capitalMarkets.sectorIndustrial",
    Entertainment: "capitalMarkets.sectorEntertainment",
  };

  const SORT_OPTIONS: { id: SortKey; label: string }[] = [
    { id: "popular", label: t("capitalMarkets.sortPopular") },
    { id: "return", label: t("capitalMarkets.sortReturnHigh") },
    { id: "return-asc", label: t("capitalMarkets.sortReturnLow") },
    { id: "alpha", label: t("capitalMarkets.sortAlpha") },
    { id: "marketcap", label: t("capitalMarkets.sortMarketCap") },
  ];
  const [data, setData] = useState<CapitalMarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("marketplace");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const [sort, setSort] = useState<SortKey>("marketcap");
  const [investAsset, setInvestAsset] = useState<MarketAssetCardData | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchDashboardJson<CapitalMarketsData>("/api/dashboard/capital-markets")
      .then(({ data: json }) => setData(json))
      .catch(() => toast.error(t("capitalMarkets.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredAssets = useMemo(() => {
    if (!data?.assets) return [];
    let list = [...data.assets];

    if (sector !== "all") {
      list = list.filter((a) => a.sector === sector);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.sector.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case "popular":
        list.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0) || b.expectedReturnPercent - a.expectedReturnPercent);
        break;
      case "return":
        list.sort((a, b) => b.expectedReturnPercent - a.expectedReturnPercent);
        break;
      case "return-asc":
        list.sort((a, b) => a.expectedReturnPercent - b.expectedReturnPercent);
        break;
      case "alpha":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort((a, b) => (a.marketCapRank ?? 999) - (b.marketCapRank ?? 999));
    }

    return list;
  }, [data?.assets, sector, search, sort]);

  const marketLabel = data?.marketStatus?.label ?? t("capitalMarkets.marketClosed");

  return (
    <DashboardGate isLoading={loading}>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-brand mb-1">
              {t("capitalMarkets.badge")}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              {t("capitalMarkets.title")}{" "}
              <span className="gold-gradient-text">{t("capitalMarkets.titleHighlight")}</span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
              {t("capitalMarkets.subtitle")}
            </p>
          </div>
          <div className="marketplace-status-bar flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 px-4 py-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  data?.marketStatus?.status === "OPEN" ? "bg-accent-green animate-pulse" : "bg-amber-400"
                )}
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">{marketLabel}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)] sm:border-l sm:border-[var(--border-subtle)] sm:pl-2">
              {data?.marketStatus?.exchanges?.join(" · ")}
            </span>
          </div>
        </div>

        {data && (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="border border-accent-brand/15 bg-accent-brand/5">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                  <PieChart size={16} className="text-accent-brand" />
                  {t("capitalMarkets.portfolioValue")}
                </div>
                <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.analytics.currentPortfolioValue)}
                </p>
                <div className="mt-2">
                  <ChangeBadge value={data.dayChange} percent={data.dayChangePercent} />
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                  <BarChart3 size={16} />
                  {t("capitalMarkets.totalInvested")}
                </div>
                <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.analytics.totalInvested)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">{t("capitalMarkets.activePositions", { count: data.positionsCount })}</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                  <Wallet size={16} />
                  {t("capitalMarkets.availableCash")}
                </div>
                <p className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(data.availableCash)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">{t("capitalMarkets.readyToDeploy")}</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm mb-1">
                  <TrendingUp size={16} />
                  {t("capitalMarkets.netPnl")}
                </div>
                <p
                  className={cn(
                    "font-mono text-2xl font-bold",
                    data.analytics.netGainLoss >= 0 ? "text-accent-green" : "text-accent-red"
                  )}
                >
                  {data.analytics.netGainLoss >= 0 ? "+" : ""}
                  {formatCurrency(data.analytics.netGainLoss)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {data.analytics.netGainLossPercent >= 0 ? "+" : ""}
                  {data.analytics.netGainLossPercent.toFixed(2)}% {t("capitalMarkets.roi")}
                </p>
              </Card>
            </div>

            <div className="dash-scroll-tabs border-b border-[var(--border-subtle)] pb-1">
              {(
                [
                  { id: "marketplace" as const, label: t("capitalMarkets.tabMarketplace"), icon: LayoutGrid },
                  { id: "portfolio" as const, label: t("capitalMarkets.tabPortfolio"), icon: PieChart },
                  { id: "analytics" as const, label: t("capitalMarkets.tabAnalytics"), icon: LineChart },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-medium rounded-t-lg transition-colors",
                    activeTab === tab.id
                      ? "text-[var(--text-primary)] border-b-2 border-accent-brand -mb-[3px]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "marketplace" && (
              <div className="space-y-5">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("capitalMarkets.searchPlaceholder")}
                      className="marketplace-field w-full pl-10 pr-4 py-2.5 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={16} className="text-[var(--text-muted)] shrink-0" />
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="marketplace-field px-3 py-2.5 text-sm"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SECTOR_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSector(f.id)}
                      className={cn(
                        "marketplace-sector-btn text-xs font-medium px-3 py-1.5 rounded-full",
                        sector === f.id && "marketplace-sector-btn-active"
                      )}
                    >
                      {t(SECTOR_LABEL_KEYS[f.id] ?? f.id)}
                    </button>
                  ))}
                </div>

                {filteredAssets.length === 0 ? (
                  <Card className="text-center py-16">
                    <LayoutGrid size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
                    <h3 className="font-semibold text-[var(--text-primary)]">{t("capitalMarkets.noAssetsTitle")}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">{t("capitalMarkets.noAssetsDesc")}</p>
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAssets.map((asset, i) => (
                      <MarketAssetCard
                        key={asset.symbol}
                        asset={asset}
                        marketStatus={marketLabel}
                        onInvest={setInvestAsset}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "portfolio" && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Card>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{t("capitalMarkets.unrealizedGain")}</p>
                    <p className="font-mono text-xl font-bold text-accent-green mt-1">
                      +{formatCurrency(data.analytics.totalProfit)}
                    </p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{t("capitalMarkets.unrealizedLoss")}</p>
                    <p className="font-mono text-xl font-bold text-accent-red mt-1">
                      -{formatCurrency(data.analytics.totalLoss)}
                    </p>
                  </Card>
                  <Card>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{t("capitalMarkets.marketRoi")}</p>
                    <p
                      className={cn(
                        "font-mono text-xl font-bold mt-1",
                        data.analytics.netGainLossPercent >= 0 ? "text-accent-green" : "text-accent-red"
                      )}
                    >
                      {data.analytics.netGainLossPercent >= 0 ? "+" : ""}
                      {data.analytics.netGainLossPercent.toFixed(2)}%
                    </p>
                  </Card>
                </div>

                <Card>
                  <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <PieChart size={18} />
                    {t("capitalMarkets.activeInvestments")}
                  </h2>
                  {data.holdings.length === 0 ? (
                    <div className="text-center py-12">
                      <BarChart3 size={40} className="mx-auto text-[var(--text-muted)] mb-4" />
                      <h3 className="font-semibold text-[var(--text-primary)]">{t("capitalMarkets.noInvestmentsTitle")}</h3>
                      <p className="text-sm text-[var(--text-secondary)] mt-2">
                        {t("capitalMarkets.noInvestmentsDesc")}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[640px]">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            <th className="text-left py-3 font-medium">{t("investments.asset")}</th>
                            <th className="text-right py-3 font-medium">{t("investments.shares")}</th>
                            <th className="text-right py-3 font-medium hidden md:table-cell">{t("capitalMarkets.costBasis")}</th>
                            <th className="text-right py-3 font-medium">{t("investments.value")}</th>
                            <th className="text-right py-3 font-medium">{t("capitalMarkets.pl")}</th>
                            <th className="text-right py-3 font-medium hidden sm:table-cell">{t("capitalMarkets.roi")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.holdings.map((h) => (
                            <tr
                              key={h.id}
                              className="border-b border-[var(--border-subtle)]/50 last:border-0 hover:bg-[var(--surface-base)] transition-colors"
                            >
                              <td className="py-4">
                                <div className="flex items-center gap-2">
                                  <StockIcon symbol={h.symbol} name={h.name} logoDomain={data.assets.find((a) => a.symbol === h.symbol)?.logoDomain} size="sm" />
                                  <div>
                                    <p className="text-[var(--text-primary)] font-medium">{h.name}</p>
                                    <p className="text-xs font-mono text-accent-brand">{h.symbol}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                      {new Date(h.investedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="text-right font-mono text-[var(--text-primary)] py-4">{h.shares.toFixed(4)}</td>
                              <td className="text-right font-mono text-[var(--text-secondary)] hidden md:table-cell py-4">
                                {formatCurrency(h.costBasis)}
                              </td>
                              <td className="text-right font-mono text-[var(--text-primary)] py-4">
                                {formatCurrency(h.marketValue)}
                              </td>
                              <td className="text-right py-4">
                                <ChangeBadge value={h.gainLoss} percent={h.gainLossPercent} />
                              </td>
                              <td className="text-right font-mono hidden sm:table-cell py-4">
                                <span className={h.roiPercent >= 0 ? "text-accent-green" : "text-accent-red"}>
                                  {h.roiPercent >= 0 ? "+" : ""}
                                  {h.roiPercent.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                <Card>
                  <h2 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <History size={18} />
                    {t("capitalMarkets.investmentHistory")}
                  </h2>
                  {data.history.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] py-6 text-center">{t("capitalMarkets.noHistory")}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[560px]">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                            <th className="text-left py-3 font-medium">{t("capitalMarkets.date")}</th>
                            <th className="text-left py-3 font-medium">{t("investments.asset")}</th>
                            <th className="text-right py-3 font-medium">{t("common.amount")}</th>
                            <th className="text-right py-3 font-medium hidden sm:table-cell">{t("capitalMarkets.fee")}</th>
                            <th className="text-right py-3 font-medium">{t("capitalMarkets.total")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.history.map((h) => (
                            <tr key={h.id} className="border-b border-[var(--border-subtle)]/50 last:border-0">
                              <td className="py-3 text-[var(--text-secondary)]">
                                {new Date(h.createdAt).toLocaleString()}
                              </td>
                              <td className="py-3">
                                <Badge variant="gold">{h.symbol}</Badge>
                                <span className="ml-2 text-[var(--text-secondary)] hidden sm:inline">{h.assetName}</span>
                              </td>
                              <td className="text-right font-mono py-3">{formatCurrency(h.amountUsd)}</td>
                              <td className="text-right font-mono text-[var(--text-muted)] hidden sm:table-cell py-3">
                                {formatCurrency(h.fee)}
                              </td>
                              <td className="text-right font-mono font-medium text-[var(--text-primary)] py-3">
                                {formatCurrency(h.totalCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <Card>
                    <h2 className="font-semibold text-[var(--text-primary)] mb-4">{t("capitalMarkets.monthlyGrowth")}</h2>
                    <ChartContainer className="h-56 min-h-[224px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.analytics.monthlyGrowth}>
                          <defs>
                            <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={CHART_BRAND} stopOpacity={0.4} />
                              <stop offset="100%" stopColor={CHART_BRAND} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="month" stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke={chartTheme.axis} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                          <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => [formatCurrency(Number(v ?? 0)), ""]} />
                          <Area type="monotone" dataKey="invested" stroke={chartTheme.muted} fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" name={t("capitalMarkets.chartInvested")} />
                          <Area type="monotone" dataKey="value" stroke={CHART_BRAND} fill="url(#growthGradient)" strokeWidth={2} name={t("capitalMarkets.chartPortfolioValue")} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </Card>

                  <Card>
                    <h2 className="font-semibold text-[var(--text-primary)] mb-4">{t("capitalMarkets.assetAllocation")}</h2>
                    {data.analytics.assetAllocation.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)] py-12 text-center">{t("capitalMarkets.allocationEmpty")}</p>
                    ) : (
                      <ChartContainer className="h-56 min-h-[224px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.analytics.assetAllocation} layout="vertical">
                            <XAxis type="number" stroke={chartTheme.axis} fontSize={12} tickFormatter={(v) => `${v}%`} />
                            <YAxis type="category" dataKey="sector" stroke={chartTheme.axis} fontSize={11} width={100} tickLine={false} />
                            <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => [`${Number(v ?? 0).toFixed(1)}%`, t("capitalMarkets.allocation")]} />
                            <Bar dataKey="percent" fill={CHART_BRAND} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </Card>
                </div>

                <Card>
                  <h2 className="font-semibold text-[var(--text-primary)] mb-4">{t("capitalMarkets.portfolioDistribution")}</h2>
                  {data.analytics.portfolioDistribution.length === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] py-12 text-center">{t("capitalMarkets.noHoldings")}</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6 items-center">
                      <ChartContainer className="h-64 min-h-[256px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={data.analytics.portfolioDistribution}
                              dataKey="value"
                              nameKey="symbol"
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={2}
                            >
                              {data.analytics.portfolioDistribution.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={chartTheme.tooltip} formatter={(v) => [formatCurrency(Number(v ?? 0)), t("capitalMarkets.chartValue")]} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                      <div className="space-y-2">
                        {data.analytics.portfolioDistribution.map((d, i) => (
                          <div key={d.symbol} className="flex items-center gap-3 text-sm">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                            <span className="font-mono font-semibold text-[var(--text-primary)] w-14">{d.symbol}</span>
                            <span className="text-[var(--text-secondary)] flex-1 truncate">{d.name}</span>
                            <span className="font-mono text-[var(--text-primary)]">{d.percent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <InvestModal
        asset={investAsset}
        walletBalance={data?.availableCash ?? 0}
        open={!!investAsset}
        onClose={() => setInvestAsset(null)}
        onSuccess={load}
      />
    </DashboardGate>
  );
}
