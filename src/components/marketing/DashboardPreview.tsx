"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard, Wallet, TrendingUp, ArrowLeftRight,
  BarChart3, Settings, Search, Bell, Wifi, ChevronRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_BRAND, CHART_MUTED, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import ChartContainer from "@/components/ui/ChartContainer";

const chartData = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 58 },
  { day: "Wed", value: 72 },
  { day: "Thu", value: 51 },
  { day: "Fri", value: 64 },
  { day: "Sat", value: 59 },
  { day: "Sun", value: 68 },
];

const sidebarIcons = [LayoutDashboard, Wallet, TrendingUp, ArrowLeftRight, BarChart3, Settings];

const transactions = [
  { name: "Wire Transfer", amount: "+$12,400", time: "2m ago" },
  { name: "Investment Buy", amount: "-$3,200", time: "1h ago" },
  { name: "Deposit", amount: "+$8,500", time: "3h ago" },
];

export default function DashboardPreview() {
  return (
    <motion.div
      className="relative mx-auto max-w-5xl"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.4 }}
    >
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-accent-brand/25 via-transparent to-accent-brand-red/15 blur-3xl" />
      <div className="relative glow-card overflow-hidden animate-float">
        <div className="light-leak light-leak-orange w-56 h-56 -top-16 -right-16 opacity-50" />
        <div className="glow-card-inner flex">
          <div className="hidden sm:flex flex-col items-center gap-3 py-6 px-3 border-r border-white/10 bg-black/40">
            {sidebarIcons.map((Icon, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-xl transition-colors ${
                  i === 0
                    ? "icon-ring h-10 w-10 bg-accent-brand/20 border-accent-brand/30"
                    : "text-text-muted hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.5} />
              </div>
            ))}
          </div>

          <div className="flex-1 p-4 sm:p-6 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-white hidden sm:block">My Dashboard</h3>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full input-glass flex-1 max-w-xs sm:ml-auto">
                <Search size={14} className="text-text-muted shrink-0" strokeWidth={1.5} />
                <span className="text-xs text-text-muted truncate">Search transactions...</span>
              </div>
              <div className="flex items-center gap-3 ml-3">
                <Bell size={16} className="text-text-muted hidden sm:block" strokeWidth={1.5} />
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full brand-gradient-bg flex items-center justify-center text-xs font-bold shadow-brand">
                    D
                  </div>
                  <span className="text-xs text-text-secondary hidden md:block">Hi David!</span>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs font-medium text-text-secondary">Revenue Flow</p>
                <ChartContainer className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="22%">
                      <XAxis dataKey="day" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar
                        dataKey="value"
                        fill={CHART_MUTED}
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: CHART_BRAND }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="glow-card !p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute inset-0 brand-gradient-bg opacity-95" />
                <div className="relative z-10">
                  <p className="text-xs text-white/80">Total Balance</p>
                  <p className="font-mono text-2xl sm:text-3xl font-bold text-white mt-1">$456,000</p>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-white/70">+18.2% this month</p>
                    <Wifi size={18} className="text-white/60" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-text-secondary">Transactions</p>
                <ChevronRight size={14} className="text-text-muted" />
              </div>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <ArrowLeftRight size={10} className="text-accent-brand" />
                      </div>
                      <span className="text-text-secondary">{tx.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={tx.amount.startsWith("+") ? "text-accent-green" : "text-text-primary"}>
                        {tx.amount}
                      </span>
                      <span className="text-text-muted">{tx.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
