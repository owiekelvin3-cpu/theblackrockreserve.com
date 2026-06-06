"use client";

import { TrendingUp, Users, ShieldCheck, type LucideIcon } from "lucide-react";

interface StatItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

const stats: StatItem[] = [
  { value: "$2.4B+", label: "Assets Under Management", icon: TrendingUp },
  { value: "50,000+", label: "Active Members", icon: Users },
  { value: "99.9%", label: "Uptime Guarantee", icon: ShieldCheck },
];

function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;

  return (
    <div className="group flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 text-center transition-colors hover:border-accent-brand/30 hover:bg-accent-brand/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition-colors group-hover:border-accent-brand/30 group-hover:bg-accent-brand/10">
        <Icon size={20} className="text-accent-brand" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight gold-gradient-text">
          {stat.value}
        </span>
        <span className="mt-1 text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
          {stat.label}
        </span>
      </div>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="relative py-10 sm:py-14 overflow-hidden" aria-label="Platform statistics">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-brand/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-text-muted mb-8">
          Trusted at scale
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  );
}
