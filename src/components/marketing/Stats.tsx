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

function StatSlide({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;

  return (
    <div className="stats-marquee-slide group flex shrink-0 items-center gap-5 px-8 sm:px-12">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition-colors group-hover:border-accent-brand/30 group-hover:bg-accent-brand/10">
        <Icon size={20} className="text-accent-brand" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight gold-gradient-text whitespace-nowrap">
          {stat.value}
        </span>
        <span className="mt-0.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.18em] text-text-muted whitespace-nowrap">
          {stat.label}
        </span>
      </div>
      <div className="stats-marquee-divider hidden sm:block" aria-hidden />
    </div>
  );
}

export default function Stats() {
  const track = [...stats, ...stats];

  return (
    <section className="relative py-10 sm:py-14 overflow-hidden" aria-label="Platform statistics">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-brand/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-text-muted">
          Trusted at scale
        </p>
      </div>

      <div className="stats-marquee-mask relative">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-32 bg-gradient-to-r from-bg-primary to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-32 bg-gradient-to-l from-bg-primary to-transparent" />

        <div className="stats-marquee-track flex w-max animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused]">
          {track.map((stat, i) => (
            <StatSlide key={`${stat.label}-${i}`} stat={stat} />
          ))}
        </div>
      </div>

      {/* Bottom glass rail */}
      <div className="mx-auto mt-8 max-w-3xl px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </section>
  );
}
