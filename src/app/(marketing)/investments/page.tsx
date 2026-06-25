"use client";

import { useState, useMemo } from "react";
import MarketingImage from "@/components/ui/MarketingImage";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CountUp from "@/components/ui/CountUp";
import ChartContainer from "@/components/ui/ChartContainer";
import { useI18n } from "@/components/providers/I18nProvider";
import { marketingImages } from "@/lib/marketing-images";

const assetClasses = [
  { name: "Stocks", description: "Individual equities from global markets", icon: "📈" },
  { name: "ETFs", description: "Diversified exchange-traded fund bundles", icon: "📊" },
  { name: "Bonds", description: "Government and corporate fixed income", icon: "🏛️" },
  { name: "Index Funds", description: "Low-cost passive index tracking", icon: "📉" },
  { name: "Crypto Indexes", description: "Curated digital asset portfolios", icon: "₿" },
];

const riskProfiles = [
  { id: "conservative", label: "Conservative", rate: 0.06 },
  { id: "moderate", label: "Moderate", rate: 0.10 },
  { id: "aggressive", label: "Aggressive", rate: 0.15 },
] as const;

const durations = [
  { label: "1 Year", years: 1 },
  { label: "5 Years", years: 5 },
  { label: "10 Years", years: 10 },
];

export default function InvestmentsPage() {
  const { formatCurrency, currencySymbol } = useI18n();
  const [amount, setAmount] = useState(10000);
  const [years, setYears] = useState(5);
  const [risk, setRisk] = useState<typeof riskProfiles[number]["id"]>("moderate");

  const rate = riskProfiles.find((r) => r.id === risk)!.rate;

  const projectedValue = useMemo(() => {
    return amount * Math.pow(1 + rate, years);
  }, [amount, rate, years]);

  const chartData = useMemo(() => {
    return Array.from({ length: years + 1 }, (_, i) => ({
      year: i === 0 ? "Now" : `Yr ${i}`,
      value: Math.round(amount * Math.pow(1 + rate, i)),
    }));
  }, [amount, rate, years]);

  return (
    <>
      <section className="section-padding pt-32 grain-overlay relative">
        <div className="mx-auto max-w-7xl text-center">
          <motion.h1
            className="font-display text-4xl sm:text-5xl font-bold text-text-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Build Wealth <span className="gold-gradient-text">Intelligently</span>
          </motion.h1>
          <motion.p
            className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            From individual stocks to curated ETF bundles — invest with confidence using institutional-grade tools.
          </motion.p>

          <motion.div
            className="mt-12 glass-card relative mx-auto max-w-4xl h-52 sm:h-72 overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <MarketingImage
              src={marketingImages.investmentsHero}
              alt="Investment portfolio and market performance charts"
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-transparent" />
          </motion.div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="mx-auto max-w-7xl">
          <Card>
            <h2 className="font-display text-2xl font-bold text-text-primary mb-8">ROI Calculator</h2>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">
                    Investment Amount: <span className="font-mono text-accent-gold">{formatCurrency(amount)}</span>
                  </label>
                  <input
                    type="range"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full accent-accent-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2">Duration</label>
                  <div className="flex gap-2">
                    {durations.map((d) => (
                      <button
                        key={d.years}
                        onClick={() => setYears(d.years)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          years === d.years
                            ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
                            : "bg-bg-tertiary text-text-secondary border border-border"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2">Risk Profile</label>
                  <div className="flex gap-2">
                    {riskProfiles.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setRisk(r.id)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          risk === r.id
                            ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
                            : "bg-bg-tertiary text-text-secondary border border-border"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-text-muted">
                    Expected annual return: {(rate * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              <div>
                <div className="text-center mb-6">
                  <p className="text-sm text-text-secondary">Projected Value</p>
                  <p className="font-mono text-4xl font-bold gold-gradient-text mt-2">
                    <CountUp end={projectedValue} prefix={currencySymbol} decimals={0} />
                  </p>
                  <p className="text-sm text-accent-green mt-1">
                    +{formatCurrency(projectedValue - amount)} ({((projectedValue / amount - 1) * 100).toFixed(1)}%)
                  </p>
                </div>
                <ChartContainer className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF5F05" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#FF5F05" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(Number(v)).replace(/\.\d+$/, "")} />
                      <Tooltip
                        contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#FFF" }}
                        formatter={(value) => [formatCurrency(Number(value ?? 0)), "Value"]}
                      />
                      <Area type="monotone" dataKey="value" stroke="#FF5F05" fill="url(#roiGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="section-padding bg-bg-secondary">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-3xl font-bold text-text-primary text-center mb-12">Asset Classes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {assetClasses.map((asset, i) => (
              <motion.div key={asset.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <Card hover className="h-full">
                  <span className="text-3xl">{asset.icon}</span>
                  <h3 className="mt-4 text-lg font-semibold text-text-primary">{asset.name}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{asset.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="red">Risk Disclaimer</Badge>
          <p className="mt-4 text-sm text-text-muted leading-relaxed">
            Investing involves risk, including the possible loss of principal. Past performance does not guarantee future results.
            The ROI calculator provides hypothetical projections and should not be considered financial advice.
            Please consult a qualified financial advisor before making investment decisions.
          </p>
        </div>
      </section>
    </>
  );
}
