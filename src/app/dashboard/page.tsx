"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet, TrendingUp, ArrowDownLeft, Receipt, RefreshCw,
  ArrowUpRight, Search, SlidersHorizontal, Plus, ChevronDown, RotateCcw,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CHART_BRAND } from "@/lib/chart-theme";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { formatCurrency } from "@/lib/utils";
import { fetchJson } from "@/lib/fetch-json";
import DashboardGate from "@/components/dashboard/DashboardGate";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import EmptyState from "@/components/dashboard/EmptyState";
import ChartContainer from "@/components/ui/ChartContainer";
import { cn } from "@/lib/utils";

interface OverviewData {
  totalBalance: number;
  savingsBalance: number;
  investmentValue: number;
  bitcoinWalletAddress: string;
  depositsEnabled: boolean;
  wallets: { id: string; flag: string; currency: string; balance: number; active: boolean; name: string }[];
  cashFlowData: { month: string; value: number }[];
  activities: {
    id: string;
    name: string;
    orderId: string;
    date: string;
    time: string;
    price: number;
    status: string;
    type: string;
  }[];
}

const activityIcons: Record<string, typeof Wallet> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: TrendingUp,
  TRANSFER: RefreshCw,
  PAYMENT: Receipt,
};

const CHART_MUTED_BAR = "#2a2a2e";

export default function DashboardPage() {
  const chartTheme = useChartTheme();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState("");
  const [chartMode, setChartMode] = useState<"monthly" | "yearly">("monthly");
  const [period, setPeriod] = useState("this-month");
  const [activitySearch, setActivitySearch] = useState("");

  const loadData = () => {
    setLoading(true);
    fetchJson<OverviewData>("/api/dashboard/overview")
      .then((json) => {
        setData(json);
        if (json?.cashFlowData?.length) {
          const active = json.cashFlowData.find((m) => m.value > 0);
          setActiveMonth(active?.month ?? json.cashFlowData[0].month);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const cashFlowTotal = useMemo(
    () => data?.cashFlowData.reduce((s, m) => s + m.value, 0) ?? 0,
    [data]
  );

  const filteredActivities = useMemo(() => {
    if (!data?.activities) return [];
    const q = activitySearch.trim().toLowerCase();
    if (!q) return data.activities;
    return data.activities.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.orderId.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
    );
  }, [data?.activities, activitySearch]);

  const hasActivity =
    data &&
    (data.totalBalance > 0 ||
      data.savingsBalance > 0 ||
      data.investmentValue > 0 ||
      data.wallets.length > 0 ||
      data.activities.length > 0);

  return (
    <DashboardGate isLoading={loading}>
      {data && (
        <div className="space-y-6">
          {/* Overview header */}
          <div className="flex flex-col gap-4">
            <DashboardGreeting />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:-mt-2">
              <div className="relative">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="dash-control-btn appearance-none pr-8 cursor-pointer"
                  aria-label="Select period"
                >
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="this-year">This Year</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
              <button type="button" onClick={loadData} className="dash-control-btn">
                <RotateCcw size={14} />
                Reset Data
              </button>
            </div>
          </div>

          {!hasActivity && (
            <div className="dash-panel p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-accent-brand/20">
              <div>
                <p className="text-sm font-semibold text-text-primary">Fund your account</p>
                <p className="text-sm text-text-muted mt-1">
                  {data.depositsEnabled
                    ? "Send Bitcoin to fund your balance. Your deposit wallet is ready."
                    : "Make a deposit to activate your balance and start using the platform."}
                </p>
              </div>
              <Link
                href="/dashboard/deposit"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold text-white brand-gradient-bg shadow-brand"
              >
                {data.depositsEnabled ? "View deposit" : "Go to Deposit"}
              </Link>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="dash-stat-primary p-5 min-h-[168px] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wallet size={20} className="text-white" />
                </div>
                <span className="dash-stat-pill dash-stat-pill-light">
                  +1.5% <ArrowUpRight size={10} />
                </span>
              </div>
              <div>
                <p className="text-sm text-white/75">My balance</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                  {formatCurrency(data.totalBalance)}
                </p>
              </div>
              <Link href="/dashboard/deposit" className="text-xs text-white/65 hover:text-white flex items-center gap-1 mt-3 transition-colors">
                See details <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="dash-stat-secondary p-5 min-h-[168px] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Wallet size={18} className="text-text-muted" />
                </div>
                <span className="dash-stat-pill dash-stat-pill-dark">+0.8%</span>
              </div>
              <div>
                <p className="text-sm text-text-muted">Savings account</p>
                <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
                  {formatCurrency(data.savingsBalance)}
                </p>
              </div>
              <Link href="/dashboard/accounts" className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mt-3 transition-colors">
                See details <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="dash-stat-secondary p-5 min-h-[168px] flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <TrendingUp size={18} className="text-text-muted" />
                </div>
                <span className="dash-stat-pill dash-stat-pill-dark">+2.1%</span>
              </div>
              <div>
                <p className="text-sm text-text-muted">Investment portfolio</p>
                <p className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
                  {formatCurrency(data.investmentValue)}
                </p>
              </div>
              <Link href="/dashboard/capital-markets" className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mt-3 transition-colors">
                See details <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>

          {/* Wallet + Cash Flow */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="dash-panel p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-text-primary">My Wallet</h2>
                <Link
                  href="/dashboard/accounts"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-brand hover:text-accent-gold-light transition-colors"
                >
                  <Plus size={14} />
                  Add New
                </Link>
              </div>
              {data.wallets.length === 0 ? (
                <p className="text-sm text-text-muted py-6 text-center">No accounts linked yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {data.wallets.map((w) => (
                    <div key={w.id} className="dash-wallet-tile p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl leading-none">{w.flag}</span>
                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            w.active
                              ? "bg-accent-green/15 text-accent-green"
                              : "bg-accent-brand/15 text-accent-brand"
                          )}
                        >
                          {w.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted font-medium">{w.currency}</p>
                      <p className="text-lg font-bold text-text-primary mt-0.5 tracking-tight">
                        {formatCurrency(w.balance, w.currency)}
                      </p>
                      <p className="text-[10px] text-text-muted mt-2 truncate">{w.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dash-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Cash Flow</h2>
                  <p className="text-xl font-bold text-text-primary mt-1 tracking-tight">
                    {formatCurrency(cashFlowTotal)}
                  </p>
                </div>
                <div className="dash-period-toggle">
                  <button
                    type="button"
                    onClick={() => setChartMode("monthly")}
                    className={cn("dash-period-btn", chartMode === "monthly" && "dash-period-btn-active")}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode("yearly")}
                    className={cn("dash-period-btn", chartMode === "yearly" && "dash-period-btn-active")}
                  >
                    Yearly
                  </button>
                </div>
              </div>
              {data.cashFlowData.every((m) => m.value === 0) ? (
                <EmptyState title="No cash flow data" description="Transaction activity will populate this chart over time." />
              ) : (
                <ChartContainer className="h-52 min-h-[208px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.cashFlowData} barCategoryGap="22%">
                      <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={chartTheme.tooltip}
                        cursor={{ fill: "rgba(255,95,5,0.06)" }}
                        formatter={(v) => [formatCurrency(Number(v ?? 0)), "Cashflow"]}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
                        {data.cashFlowData.map((entry) => (
                          <Cell
                            key={entry.month}
                            fill={entry.month === activeMonth ? CHART_BRAND : CHART_MUTED_BAR}
                            onClick={() => setActiveMonth(entry.month)}
                            style={{ cursor: "pointer" }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="dash-panel p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <h2 className="text-base font-semibold text-text-primary">Recent Activities</h2>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="search"
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    placeholder="Search..."
                    className="dash-table-search w-full pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-brand/40"
                  />
                </div>
                <button type="button" className="dash-control-btn shrink-0">
                  <SlidersHorizontal size={14} />
                  Filter
                </button>
              </div>
            </div>

            {filteredActivities.length === 0 ? (
              <p className="text-sm text-text-muted py-10 text-center">No recent transactions.</p>
            ) : (
              <>
                <div className="md:hidden space-y-2">
                  {filteredActivities.map((a) => {
                    const Icon = activityIcons[a.type] ?? Wallet;
                    return (
                      <div key={a.id} className="dash-wallet-tile p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                              <Icon size={14} className="text-accent-brand" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-text-primary font-medium truncate">{a.name}</p>
                              <p className="text-xs text-text-muted mt-0.5">{a.orderId}</p>
                            </div>
                          </div>
                          <p className={cn("text-sm font-mono font-medium shrink-0", a.price >= 0 ? "text-accent-green" : "text-text-primary")}>
                            {a.price >= 0 ? "+" : ""}{formatCurrency(a.price)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs text-text-muted">
                          <span>{a.date} · {a.time}</span>
                          <span className="inline-flex items-center gap-1.5 text-text-primary">
                            <span className={cn("h-1.5 w-1.5 rounded-full", a.status === "Completed" ? "bg-accent-green" : a.status === "Failed" ? "bg-accent-red" : "bg-accent-gold")} />
                            {a.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-text-muted text-xs border-b border-white/10">
                        <th className="text-left py-3 pr-4 font-medium">Activity</th>
                        <th className="text-left py-3 font-medium">Reference</th>
                        <th className="text-left py-3 font-medium">Date</th>
                        <th className="text-left py-3 font-medium">Time</th>
                        <th className="text-right py-3 font-medium">Amount</th>
                        <th className="text-right py-3 pl-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActivities.map((a) => {
                        const Icon = activityIcons[a.type] ?? Wallet;
                        return (
                          <tr key={a.id} className="dash-table-row border-b border-white/5 transition-colors">
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                  <Icon size={14} className="text-accent-brand" />
                                </div>
                                <span className="text-text-primary font-medium">{a.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 text-text-muted font-mono text-xs">{a.orderId}</td>
                            <td className="py-3.5 text-text-muted">{a.date}</td>
                            <td className="py-3.5 text-text-muted">{a.time}</td>
                            <td className={cn("py-3.5 text-right font-mono font-medium", a.price >= 0 ? "text-accent-green" : "text-text-primary")}>
                              {a.price >= 0 ? "+" : ""}{formatCurrency(a.price)}
                            </td>
                            <td className="py-3.5 text-right pl-4">
                              <span className="inline-flex items-center gap-1.5 text-xs text-text-primary">
                                <span className={cn("h-1.5 w-1.5 rounded-full", a.status === "Completed" ? "bg-accent-green" : a.status === "Failed" ? "bg-accent-red" : "bg-accent-gold")} />
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardGate>
  );
}
