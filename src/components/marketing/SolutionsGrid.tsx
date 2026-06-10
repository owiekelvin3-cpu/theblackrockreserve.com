"use client";

import { motion } from "framer-motion";
import {
  Shield, Globe, Zap, CreditCard, PieChart, Headphones,
} from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";
import { cardHover } from "@/components/ui/AnimateIn";
import { useI18n } from "@/components/providers/I18nProvider";

const solutionIcons = [Shield, Globe, Zap, CreditCard, PieChart, Headphones];

const solutionKeys = [
  { title: "marketing.solutions.securityTitle", desc: "marketing.solutions.securityDesc" },
  { title: "marketing.solutions.transfersTitle", desc: "marketing.solutions.transfersDesc" },
  { title: "marketing.solutions.depositsTitle", desc: "marketing.solutions.depositsDesc" },
  { title: "marketing.solutions.cardsTitle", desc: "marketing.solutions.cardsDesc" },
  { title: "marketing.solutions.portfolioTitle", desc: "marketing.solutions.portfolioDesc" },
  { title: "marketing.solutions.supportTitle", desc: "marketing.solutions.supportDesc" },
] as const;

export default function SolutionsGrid() {
  const { t } = useI18n();

  return (
    <section className="section-padding relative">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t("marketing.solutions.title")}{" "}
            <span className="gold-gradient-text">{t("marketing.solutions.titleHighlight")}</span>
          </h2>
          <p className="mt-3 text-sm text-text-secondary max-w-lg mx-auto">
            {t("marketing.solutions.subtitle")}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {solutionKeys.map((item, i) => (
            <motion.div
              key={item.title}
              className="glow-card hover-lift p-6 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              {...cardHover}
            >
              <div className="glow-card-inner flex gap-4">
                <GlowIcon icon={solutionIcons[i]} size={18} className="shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{t(item.title)}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{t(item.desc)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
