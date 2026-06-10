"use client";

import MarketingImage from "@/components/ui/MarketingImage";
import { motion } from "framer-motion";
import {
  Brain, Bot, LineChart, Mic, BarChart3, Sparkles,
} from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";
import { MiniBarChart, MiniLineChart } from "@/components/marketing/MiniCharts";
import { cardHover } from "@/components/ui/AnimateIn";
import { marketingImages } from "@/lib/marketing-images";
import { useI18n } from "@/components/providers/I18nProvider";

const supportPhotos = [
  marketingImages.portraits.support1,
  marketingImages.portraits.support2,
  marketingImages.portraits.support3,
  marketingImages.portraits.support4,
  marketingImages.portraits.support5,
];

function AiNodes() {
  return (
    <div className="relative h-32 sm:h-40 flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="w-full h-full opacity-30" viewBox="0 0 200 120">
          <line x1="100" y1="60" x2="50" y2="30" stroke="#ff5f05" strokeWidth="1" />
          <line x1="100" y1="60" x2="150" y2="30" stroke="#ff5f05" strokeWidth="1" />
          <line x1="100" y1="60" x2="40" y2="80" stroke="#ff5f05" strokeWidth="1" />
          <line x1="100" y1="60" x2="160" y2="80" stroke="#ff5f05" strokeWidth="1" />
          <line x1="100" y1="60" x2="100" y2="15" stroke="#ff5f05" strokeWidth="1" />
        </svg>
      </div>
      <div className="relative z-10">
        <GlowIcon icon={Brain} size={24} variant="hex" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-accent-brand shadow-[0_0_12px_rgba(255,95,5,0.8)]"
          style={{
            top: `${[15, 25, 70, 75, 10][i]}%`,
            left: `${[25, 75, 20, 80, 50][i]}%`,
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function SoundWave() {
  return (
    <div className="flex items-center justify-center gap-1 h-16 sm:h-20">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-accent-brand"
          style={{ height: `${12 + Math.sin(i * 0.6) * 20}px`, transformOrigin: "bottom" }}
          animate={{ scaleY: [0.3, 0.5 + Math.sin(i * 0.5) * 0.5, 0.3] }}
          transition={{ duration: 1.2, delay: i * 0.04, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function Features() {
  const { t } = useI18n();

  return (
    <section className="section-padding relative">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">
            <Sparkles size={12} className="inline mr-1.5 text-accent-brand" />
            {t("marketing.features.badge")}
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-4 max-w-3xl mx-auto text-balance">
            {t("marketing.features.title")}{" "}
            <span className="gold-gradient-text">{t("marketing.features.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="space-y-5">
          <div className="grid lg:grid-cols-5 gap-5">
            <motion.div
              className="glow-card hover-lift lg:col-span-3 p-6 sm:p-8 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              {...cardHover}
            >
              <div className="light-leak light-leak-orange w-40 h-40 -top-8 -right-8 opacity-40" />
              <div className="glow-card-inner">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                  {t("marketing.features.aiTitle")}
                </h3>
                <p className="text-sm text-text-secondary mb-4 max-w-md">
                  {t("marketing.features.aiDesc")}
                </p>
                <AiNodes />
              </div>
            </motion.div>

            <motion.div
              className="glow-card hover-lift lg:col-span-2 p-6 sm:p-8 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              {...cardHover}
            >
              <div className="glow-card-inner">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                  {t("marketing.features.supportTitle")}
                </h3>
                <p className="text-sm text-text-secondary mb-6">
                  {t("marketing.features.supportDesc")}
                </p>
                <div className="relative flex items-center justify-center h-28">
                  <div className="absolute">
                    <GlowIcon icon={Bot} size={22} />
                  </div>
                  {supportPhotos.map((photo, i) => {
                    const angle = (i / supportPhotos.length) * 2 * Math.PI - Math.PI / 2;
                    const x = Math.cos(angle) * 55;
                    const y = Math.sin(angle) * 40;
                    return (
                      <motion.div
                        key={photo}
                        className="absolute h-8 w-8"
                        style={{ left: `calc(50% + ${x}px - 16px)`, top: `calc(50% + ${y}px - 16px)` }}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{
                          opacity: { delay: 0.2 + i * 0.08, duration: 0.4 },
                          scale: { delay: 0.2 + i * 0.08, type: "spring", stiffness: 260 },
                          y: { duration: 2.5, delay: 0.6 + i * 0.2, repeat: Infinity, ease: "easeInOut" },
                        }}
                      >
                        <div className="relative h-full w-full rounded-full overflow-hidden shadow-brand border-2 border-bg-primary">
                          <MarketingImage src={photo} alt="" fill className="object-cover" sizes="32px" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <motion.div
              className="glow-card hover-lift p-6 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              {...cardHover}
            >
              <div className="glow-card-inner">
                <GlowIcon icon={LineChart} size={18} className="mb-4" />
                <h3 className="text-sm font-semibold text-white mb-1">{t("marketing.features.integrationTitle")}</h3>
                <p className="text-xs text-text-secondary mb-4">{t("marketing.features.integrationDesc")}</p>
                <div className="h-20 w-full">
                  <MiniLineChart animate />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="glow-card hover-lift sm:col-span-2 p-6 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              {...cardHover}
            >
              <div className="light-leak light-leak-red w-32 h-32 -bottom-8 right-0 opacity-30" />
              <div className="glow-card-inner flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <GlowIcon icon={Mic} size={18} />
                    <h3 className="text-sm font-semibold text-white">{t("marketing.features.automationTitle")}</h3>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {t("marketing.features.automationDesc")}
                  </p>
                </div>
                <div className="flex-1 w-full">
                  <SoundWave />
                </div>
              </div>
            </motion.div>

            <motion.div
              className="glow-card hover-lift p-6 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              {...cardHover}
            >
              <div className="glow-card-inner">
                <GlowIcon icon={BarChart3} size={18} className="mb-4" />
                <h3 className="text-sm font-semibold text-white mb-1">{t("marketing.features.visualizationTitle")}</h3>
                <p className="text-xs text-text-secondary mb-4">{t("marketing.features.visualizationDesc")}</p>
                <div className="h-20 w-full">
                  <MiniBarChart animate />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
