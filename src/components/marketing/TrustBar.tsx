"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/components/providers/I18nProvider";

const usCompanies = [
  "JPMorgan Chase",
  "Goldman Sachs",
  "Morgan Stanley",
  "Bank of America",
  "Wells Fargo",
  "Fidelity",
  "Charles Schwab",
  "Vanguard",
  "Citigroup",
  "American Express",
  "Capital One",
  "Berkshire Hathaway",
  "PayPal",
  "Stripe",
];

export default function TrustBar() {
  const { t } = useI18n();
  const slides = [...usCompanies, ...usCompanies];

  return (
    <section className="py-12 sm:py-16 border-y border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p
          className="text-center text-sm text-text-muted mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {t("marketing.trustBar.trusted", { count: "10,000+" })}
        </motion.p>

        <motion.div
          className="stats-marquee-mask overflow-hidden"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="stats-marquee-track flex animate-marquee">
            {slides.map((name, i) => (
              <div key={`${name}-${i}`} className="stats-marquee-slide flex items-center px-8 sm:px-12">
                <span className="text-base sm:text-lg font-semibold text-white/30 tracking-tight whitespace-nowrap select-none">
                  {name}
                </span>
                {i < slides.length - 1 && <div className="stats-marquee-divider" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
