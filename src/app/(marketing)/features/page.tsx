"use client";

import MarketingImage from "@/components/ui/MarketingImage";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { marketingImages } from "@/lib/marketing-images";

const featureDetails = [
  {
    id: "banking",
    title: "Smart Banking",
    image: marketingImages.features.banking,
    imageAlt: "Professional reviewing digital banking on a laptop",
    description: "Manage multi-currency accounts with real-time balances, instant transfers, and automated savings rules. Our smart banking engine learns your patterns to optimize your cash flow.",
    highlights: ["Multi-currency accounts", "Instant P2P transfers", "Automated savings", "Bill pay automation"],
    reverse: false,
  },
  {
    id: "investments",
    title: "Investment Suite",
    image: marketingImages.features.investments,
    imageAlt: "Stock market charts on a trading display",
    description: "Trade stocks, ETFs, and crypto indexes with zero commissions. Access advanced charting, real-time quotes, and curated portfolio bundles designed by our investment team.",
    highlights: ["Zero-commission trades", "Real-time market data", "ETF bundles", "Portfolio rebalancing"],
    reverse: true,
  },
  {
    id: "security",
    title: "Bank-Grade Security",
    image: marketingImages.features.security,
    imageAlt: "Secure online banking with card and laptop",
    description: "Your security is our top priority. Multi-factor authentication, biometric login, and AI-powered fraud detection work together to keep your assets safe 24/7.",
    highlights: ["2FA & biometrics", "Fraud detection AI", "Device management", "Session monitoring"],
    reverse: true,
  },
  {
    id: "integration",
    title: "Global Transfers & Integration",
    image: marketingImages.features.integration,
    imageAlt: "Global finance and international transfers",
    description: "Send money to 50+ countries with competitive exchange rates and transparent fees. Track every transfer in real-time from initiation to delivery.",
    highlights: ["50+ countries", "Live exchange rates", "Transfer tracking", "Scheduled payments"],
    reverse: false,
  },
  {
    id: "analytics",
    title: "Wealth Analytics",
    image: marketingImages.features.analytics,
    imageAlt: "Wealth analytics dashboard with charts",
    description: "Get a complete picture of your financial health with real-time portfolio tracking, performance attribution, and personalized insights powered by advanced analytics.",
    highlights: ["Portfolio dashboard", "Performance tracking", "Tax-loss harvesting", "Custom reports"],
    reverse: true,
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="section-padding pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="relative mb-12 h-48 sm:h-64 overflow-hidden rounded-2xl glass-card">
            <MarketingImage
              src={marketingImages.officeWide}
              alt="Modern fintech workspace"
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-bg-primary/40 to-transparent" />
          </div>
          <div className="text-center">
          <motion.h1
            className="font-display text-4xl sm:text-5xl font-bold text-text-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Powerful Features, <span className="gold-gradient-text">Seamless Experience</span>
          </motion.h1>
          <motion.p
            className="mt-6 text-lg text-text-secondary max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Every tool you need to manage, grow, and protect your wealth — designed with precision and elegance.
          </motion.p>
          </div>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="mx-auto max-w-7xl space-y-24">
          {featureDetails.map((feature, i) => (
            <motion.div
              key={feature.id}
              id={feature.id}
              className="scroll-mt-28 grid lg:grid-cols-2 gap-12 items-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={feature.reverse ? "lg:order-2" : ""}>
                <Card className="relative h-64 sm:h-80 overflow-hidden p-0">
                  <MarketingImage
                    src={feature.image}
                    alt={feature.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/60 via-transparent to-transparent" />
                </Card>
              </div>
              <div className={feature.reverse ? "lg:order-1" : ""}>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-text-primary">{feature.title}</h2>
                <p className="mt-4 text-text-secondary leading-relaxed">{feature.description}</p>
                <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {feature.highlights.map((h) => (
                    <li key={h} className="text-sm text-text-secondary flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-gold" />
                      {h}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard" className="inline-block mt-6">
                  <Button variant="outline" size="sm">
                    Explore in Dashboard <ArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  );
}
