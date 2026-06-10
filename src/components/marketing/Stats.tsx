"use client";

import { TrendingUp, Users, ShieldCheck, type LucideIcon } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

interface StatItem {
  value: string;
  labelKey: string;
  icon: LucideIcon;
}

const stats: StatItem[] = [
  { value: "$2.4B+", labelKey: "marketing.stats.aum", icon: TrendingUp },
  { value: "50,000+", labelKey: "marketing.stats.members", icon: Users },
  { value: "99.9%", labelKey: "marketing.stats.uptime", icon: ShieldCheck },
];

function StatCard({ stat, label }: { stat: StatItem; label: string }) {
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
          {label}
        </span>
      </div>
    </div>
  );
}

export default function Stats() {
  const { t } = useI18n();

  return (
    <section className="relative py-10 sm:py-14 overflow-hidden" aria-label={t("marketing.stats.ariaLabel")}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-brand/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-text-muted mb-8">
          {t("marketing.stats.heading")}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.labelKey} stat={stat} label={t(stat.labelKey)} />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-3xl px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  );
}
