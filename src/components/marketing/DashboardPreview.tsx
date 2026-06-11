"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard, Wallet, TrendingUp, ArrowLeftRight,
  BarChart3, Settings, Search, Bell, Wifi, ChevronRight,
} from "lucide-react";
import { RevenueBarChart } from "@/components/marketing/MiniCharts";
import { fadeUp, stagger } from "@/components/ui/AnimateIn";

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
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-accent-brand/25 via-transparent to-accent-brand-red/15 blur-3xl animate-pulseGlow" />
      <motion.div
        className="relative glow-card overflow-hidden"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="light-leak light-leak-orange w-56 h-56 -top-16 -right-16 opacity-50" />
        <div className="glow-card-inner flex">
          <div className="hidden sm:flex flex-col items-center gap-3 py-6 px-3 border-r border-white/10 bg-black/40">
            {sidebarIcons.map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.4 }}
                className={`p-2.5 rounded-xl transition-colors ${
                  i === 0
                    ? "icon-ring h-10 w-10 bg-accent-brand/20 border-accent-brand/30"
                    : "text-text-muted hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.5} />
              </motion.div>
            ))}
          </div>

          <div className="flex-1 p-4 sm:p-6 min-w-0">
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <h3 className="text-sm font-semibold text-white shrink-0">My Dashboard</h3>
              <div className="flex items-center gap-2 min-w-0 flex-1 sm:justify-end">
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full input-glass flex-1 sm:flex-initial sm:max-w-xs min-w-0">
                  <Search size={14} className="text-text-muted shrink-0" strokeWidth={1.5} />
                  <span className="text-xs text-text-muted truncate">Search transactions...</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Bell size={16} className="text-text-muted hidden sm:block" strokeWidth={1.5} />
                  <div className="h-8 w-8 rounded-full brand-gradient-bg flex items-center justify-center text-xs font-bold shadow-brand">
                    D
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-4">
              <motion.div
                className="lg:col-span-2 space-y-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.5 }}
              >
                <p className="text-xs font-medium text-text-secondary">Revenue Flow</p>
                <motion.div
                  className="h-36 w-full rounded-xl transition-colors hover:bg-white/[0.02]"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.25 }}
                >
                  <RevenueBarChart animate />
                </motion.div>
              </motion.div>

              <motion.div
                className="glow-card !p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.75, duration: 0.5 }}
              >
                <div className="absolute inset-0 brand-gradient-bg opacity-95" />
                <div className="relative z-10">
                  <p className="text-xs text-white/80">Total Balance</p>
                  <motion.p
                    className="font-mono text-2xl sm:text-3xl font-bold text-white mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 0.6 }}
                  >
                    $456,000
                  </motion.p>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-white/70">+18.2% this month</p>
                    <Wifi size={18} className="text-white/60" strokeWidth={1.5} />
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              className="mt-4 pt-4 border-t border-white/10"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-text-secondary">Transactions</p>
                <ChevronRight size={14} className="text-text-muted" />
              </div>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <motion.div
                    key={tx.name}
                    variants={fadeUp}
                    className="flex items-center justify-between gap-2 text-xs min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <ArrowLeftRight size={10} className="text-accent-brand" />
                      </div>
                      <span className="text-text-secondary truncate">{tx.name}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className={tx.amount.startsWith("+") ? "text-accent-green" : "text-text-primary"}>
                        {tx.amount}
                      </span>
                      <span className="text-text-muted hidden sm:inline">{tx.time}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
