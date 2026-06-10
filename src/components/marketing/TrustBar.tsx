"use client";

import { motion } from "framer-motion";
import { Building2, Globe2, ShieldCheck, TrendingUp } from "lucide-react";

const trustStats = [
  { icon: Building2, value: "10,000+", label: "Active accounts worldwide" },
  { icon: Globe2, value: "50+", label: "Countries served" },
  { icon: TrendingUp, value: "$4.2B+", label: "Assets on platform" },
  { icon: ShieldCheck, value: "99.9%", label: "Platform uptime" },
];

const trustedOrganizations = [
  {
    name: "Meridian Family Office",
    category: "Ultra-high-net-worth",
    location: "London, United Kingdom",
    detail: "$320M consolidated portfolio · Client since 2020",
  },
  {
    name: "Horizon Ventures LP",
    category: "Venture capital",
    location: "Palo Alto, California",
    detail: "14 fund accounts · Active Capital Markets desk",
  },
  {
    name: "Okonkwo Capital Group",
    category: "Asset management",
    location: "Lagos, Nigeria",
    detail: "Multi-currency treasury · Joint account structure",
  },
  {
    name: "Sharma Medical Holdings",
    category: "Professional practice",
    location: "New York, New York",
    detail: "$2.1M invested balance · Automated savings rules",
  },
  {
    name: "Chen Technology Trust",
    category: "Corporate treasury",
    location: "San Francisco, California",
    detail: "48 employee wallets · Payroll-linked accounts",
  },
  {
    name: "Williams Property Group",
    category: "Real estate investment",
    location: "Miami, Florida",
    detail: "$8.4M in holdings · Same-day withdrawal rails",
  },
  {
    name: "Rodriguez Growth Co.",
    category: "Startup & SMB banking",
    location: "Austin, Texas",
    detail: "Business checking + ETF sleeve · KYC in under 24h",
  },
  {
    name: "Turner Financial Services",
    category: "Registered advisory",
    location: "Chicago, Illinois",
    detail: "120+ referred households · Branded client reporting",
  },
  {
    name: "Blackwell Pension Fund",
    category: "Institutional allocator",
    location: "Boston, Massachusetts",
    detail: "Bond & index allocation · Quarterly rebalancing",
  },
  {
    name: "Pacific Rim Exports Ltd",
    category: "International trade",
    location: "Singapore",
    detail: "6 currency accounts · Cross-border settlement",
  },
  {
    name: "Atlas Wealth Advisors",
    category: "RIA / wealth management",
    location: "Zurich, Switzerland",
    detail: "200+ client dashboards · Performance attribution",
  },
  {
    name: "Northgate Manufacturing",
    category: "Corporate banking",
    location: "Detroit, Michigan",
    detail: "FDIC-insured deposits · Treasury automation",
  },
];

function TrustSlide({ org }: { org: (typeof trustedOrganizations)[number] }) {
  const initials = org.name
    .split(" ")
    .filter((w) => w.length > 2 && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div className="stats-marquee-slide flex items-center px-4 sm:px-6">
      <div className="flex items-center gap-4 min-w-[280px] sm:min-w-[340px] max-w-[360px] rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3.5 sm:px-5 sm:py-4 backdrop-blur-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl brand-gradient-bg text-xs font-bold text-white shadow-brand">
          {initials || "BR"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{org.name}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-accent-brand/90">
            {org.category}
          </p>
          <p className="mt-1 truncate text-xs text-text-muted">{org.location}</p>
          <p className="mt-1.5 text-[11px] leading-snug text-text-secondary line-clamp-2">
            {org.detail}
          </p>
        </div>
      </div>
      <div className="stats-marquee-divider hidden sm:block" />
    </div>
  );
}

export default function TrustBar() {
  const slides = [...trustedOrganizations, ...trustedOrganizations];

  return (
    <section className="py-12 sm:py-16 border-y border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm sm:text-base text-text-muted leading-relaxed">
            Trusted by{" "}
            <span className="text-white font-semibold">10,000+</span> investors, businesses, and finance
            teams worldwide
          </p>
          <p className="mt-2 text-xs sm:text-sm text-text-muted/90 leading-relaxed">
            From family offices and RIAs to founders and global trade companies — organizations across{" "}
            <span className="text-text-secondary">50+ countries</span> run banking, investments, loans,
            and capital markets on Blackrock Reserve.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-12"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
        >
          {trustStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 sm:px-5 sm:py-4 text-center"
            >
              <stat.icon size={18} className="mx-auto mb-2 text-accent-brand" />
              <p className="text-lg sm:text-xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-[10px] sm:text-xs text-text-muted leading-snug">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          className="stats-marquee-mask overflow-hidden"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="stats-marquee-track flex animate-marquee gap-4 sm:gap-6">
            {slides.map((org, i) => (
              <TrustSlide key={`${org.name}-${i}`} org={org} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
