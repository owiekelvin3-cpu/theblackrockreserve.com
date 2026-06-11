"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { stagger, fadeUp } from "@/components/ui/AnimateIn";
import { useI18n } from "@/components/providers/I18nProvider";

const DashboardPreview = dynamic(() => import("@/components/marketing/DashboardPreview"), {
  ssr: true,
});

export default function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden">
      <div className="hero-halo" />
      <div className="hero-halo-arc" />
      <div className="neon-streak top-[20%] left-0 w-full h-24 opacity-30" />

      <motion.div
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-[calc(8rem+env(safe-area-inset-top,0px))] sm:pt-[calc(9rem+env(safe-area-inset-top,0px))] pb-12 text-center w-full"
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="pill-label mb-6 mx-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-brand animate-pulseGlow mr-2 inline-block" />
          {t("marketing.hero.badge")}
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-text-primary leading-[1.1] tracking-tight text-balance max-w-4xl mx-auto"
        >
          {t("marketing.hero.title")}{" "}
          <span className="gold-gradient-text">{t("marketing.hero.titleHighlight")}</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-5 text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed"
        >
          {t("marketing.hero.subtitle")}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href="/register">
            <Button size="lg" className="rounded-full px-8 min-w-[180px]">
              {t("marketing.hero.openAccount")} <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="rounded-full px-8 min-w-[180px]">
              {t("marketing.hero.bookDemo")} <ArrowRight size={18} />
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-14 sm:mt-16 lg:mt-20">
          <DashboardPreview />
        </motion.div>
      </motion.div>
    </section>
  );
}
