"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, BarChart3, Wallet, PieChart, ArrowUpRight,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import DashboardGate from "@/components/dashboard/DashboardGate";
import ChartContainer from "@/components/ui/ChartContainer";
import { formatCurrency, cn } from "@/lib/utils";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { CHART_BRAND, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface Holding {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  shares: number;
  avgPrice: number;
  marketPrice: number;
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
  dayChangePercent: number;
}

interface MarketQuote {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
}

interface CapitalMarketsData {
  portfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  positionsCount: number;
  availableCash: number;
  holdings: Holding[];
  marketWatchlist: MarketQuote[];
}

const assetClasses = ["Equities", "ETFs", "Index Funds", "Fixed Income"];

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
  const [data, setData] = useState<CapitalMarketsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"holdings" | "markets">("holdings");

  useEffect(() => {
    fetchDashboardJson<CapitalMarketsData>("/api/dashboard/capital-markets")
      .then(({ data: json }) => setData(json))
      .finally(() => setLoading(false));
  }, []);

  const performanceData =
    data?.holdings.map((h, i) => ({
      label: h.symbol,
      value: Math.round(h.marketValue),
      index: i,
    })) ?? [];

  return (
    <DashboardGate isLoading={loading}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent-brand mb-1">
              Capital Markets
            </p>
            <h1 className="text-2xl font-bold text-white">
              Equities & <span className="gold-gradient-text">Securities</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1 max-w-xl">
              Institutional-grade access to global equity markets, ETFs, and index instruments.
            </p>
          </div>
          <Button size="sm" disabled className="shrink-0">
            Place Order <ArrowUpRight size={16} />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {assetClasses.map((cls) => (
            <span
              key={cls}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-text-secondary"
            >
              {cls}
            </span>
          ))}
        </div>

        {data && (
          <>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="border border-accent-brand/15 bg-accent-brand/5">
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
                  <PieChart size={16} className="text-accent-brand" />
                  Portfolio Value
                </div>
                <p className="font-mono text-2xl font-bold text-white">{formatCurrency(data.portfolioValue)}</p>
                <div className="mt-2">
                  <ChangeBadge value={data.dayChange} percent={data.dayChangePercent} />
                </div>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
                  <BarChart3 size={16} />
                  Active Positions
                </div>
                <p className="font-mono text-2xl font-bold text-white">{data.positionsCount}</p>
                <p className="text-xs text-text-muted mt-2">Equity & ETF holdings</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
                  <Wallet size={16} />
                  Available Cash
                </div>
                <p className="font-mono text-2xl font-bold text-white">{formatCurrency(data.availableCash)}</p>
                <p className="text-xs text-text-muted mt-2">Ready to deploy</p>
              </Card>
              <Card>
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-1">
                  <TrendingUp size={16} />
                  Market Status
                </div>
                <p className="text-lg font-bold text-accent-green">Open</p>
                <p className="text-xs text-text-muted mt-2">NYSE · NASDAQ · LSE</p>
              </Card>
            </div>

            {performanceData.length > 0 && (
              <Card>
                <h2 className="font-semibold text-white mb-4">Portfolio Allocation</h2>
                <ChartContainer className="h-56 min-h-[224px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performanceData}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_BRAND} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={CHART_BRAND} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#475569"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [formatCurrency(Number(v ?? 0)), "Value"]} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={CHART_BRAND}
                        fill="url(#equityGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </Card>
            )}

            <div className="flex gap-2 border-b border-white/10 pb-1">
              {(
                [
                  { id: "holdings" as const, label: "Your Holdings" },
                  { id: "markets" as const, label: "Market Watchlist" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
                    activeTab === tab.id
                      ? "text-white border-b-2 border-accent-brand -mb-[3px]"
                      : "text-text-secondary hover:text-white"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "holdings" ? (
              <Card>
                {data.holdings.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 size={40} className="mx-auto text-text-muted mb-4" />
                    <h3 className="font-semibold text-white">No equity positions yet</h3>
                    <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
                      Build your securities portfolio by acquiring stocks, ETFs, or index funds through your
                      relationship manager or upcoming self-directed trading.
                    </p>
                    <Button size="sm" className="mt-6" disabled>
                      Explore Securities
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-text-secondary">
                          <th className="text-left py-3 font-medium">Security</th>
                          <th className="text-left py-3 font-medium hidden md:table-cell">Sector</th>
                          <th className="text-right py-3 font-medium">Shares</th>
                          <th className="text-right py-3 font-medium hidden sm:table-cell">Avg Cost</th>
                          <th className="text-right py-3 font-medium">Market Price</th>
                          <th className="text-right py-3 font-medium">Value</th>
                          <th className="text-right py-3 font-medium">P&amp;L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.holdings.map((h) => (
                          <tr
                            key={h.id}
                            className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <Badge variant="gold">{h.symbol}</Badge>
                                <span className="text-text-secondary hidden sm:inline">{h.name}</span>
                              </div>
                            </td>
                            <td className="py-4 text-text-muted hidden md:table-cell">{h.sector}</td>
                            <td className="text-right font-mono text-white py-4">{h.shares}</td>
                            <td className="text-right font-mono text-text-secondary hidden sm:table-cell py-4">
                              {formatCurrency(h.avgPrice)}
                            </td>
                            <td className="text-right font-mono text-white py-4">{formatCurrency(h.marketPrice)}</td>
                            <td className="text-right font-mono text-white py-4">{formatCurrency(h.marketValue)}</td>
                            <td className="text-right py-4">
                              <ChangeBadge percent={h.gainLossPercent} value={h.gainLoss} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-text-secondary">
                        <th className="text-left py-3 font-medium">Symbol</th>
                        <th className="text-left py-3 font-medium hidden sm:table-cell">Name</th>
                        <th className="text-left py-3 font-medium hidden md:table-cell">Sector</th>
                        <th className="text-right py-3 font-medium">Last Price</th>
                        <th className="text-right py-3 font-medium">Day Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.marketWatchlist.map((q) => (
                        <tr
                          key={q.symbol}
                          className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4">
                            <Badge variant="gold">{q.symbol}</Badge>
                          </td>
                          <td className="py-4 text-text-secondary hidden sm:table-cell">{q.name}</td>
                          <td className="py-4 text-text-muted hidden md:table-cell">{q.sector}</td>
                          <td className="text-right font-mono text-white py-4">{formatCurrency(q.price)}</td>
                          <td className="text-right py-4">
                            <ChangeBadge value={q.change} percent={q.changePercent} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardGate>
  );
}
