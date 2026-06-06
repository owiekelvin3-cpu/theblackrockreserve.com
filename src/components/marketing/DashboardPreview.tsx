"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard, Wallet, TrendingUp, ArrowLeftRight,
  BarChart3, Settings, Search, Bell, Wifi,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_BRAND, CHART_MUTED, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";
import ChartContainer from "@/components/ui/ChartContainer";

const chartData = [
  { day: "Jan", value: 42 }, { day: "Feb", value: 58 }, { day: "Mar", value: 72 },
  { day: "Apr", value: 51 }, { day: "May", value: 64 }, { day: "Jun", value: 59 },
  { day: "Jul", value: 68 },
];

const sidebarIcons = [LayoutDashboard, Wallet, TrendingUp, ArrowLeftRight, BarChart3, Settings];
const tabs = ["All", "Withdrawal", "Savings", "Deposit"];

export default function DashboardPreview() {
  return (
    <motion.div
      className="relative mx-auto max-w-5xl"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.4 }}
    >
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-accent-brand/20 via-transparent to-accent-brand-red/15 blur-3xl" />
      <div className="relative glow-card overflow-hidden animate-float">
        <div className="light-leak light-leak-orange w-48 h-48 -top-12 -right-12 opacity-40" />
        <div className="glow-card-inner flex">
          <div className="hidden sm:flex flex-col items-center gap-4 py-6 px-3 border-r border-white/10 bg-black/30">
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full input-glass flex-1 max-w-xs">
                <Search size={14} className="text-text-muted" strokeWidth={1.5} />
                <span className="text-xs text-text-muted">Search transactions...</span>
              </div>
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-text-muted" strokeWidth={1.5} />
                <div className="h-8 w-8 rounded-full brand-gradient-bg flex items-center justify-center text-xs font-bold shadow-brand">P</div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {tabs.map((tab, i) => (
                    <span
                      key={tab}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                        i === 0 ? "brand-gradient-bg text-white shadow-brand" : "pill-label"
                      }`}
                    >
                      {tab}
                    </span>
                  ))}
                </div>
                <ChartContainer className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barCategoryGap="20%">
                      <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="value" fill={CHART_MUTED} radius={[4, 4, 0, 0]} activeBar={{ fill: CHART_BRAND }} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="glow-card !p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden">
                <div className="absolute inset-0 brand-gradient-bg opacity-90" />
                <div className="relative z-10">
                  <p className="text-xs text-white/80">Total Balance</p>
                  <p className="font-mono text-2xl font-bold text-white mt-1">$28,520.30</p>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-white/70">+12.4% this month</p>
                    <Wifi size={18} className="text-white/60" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
