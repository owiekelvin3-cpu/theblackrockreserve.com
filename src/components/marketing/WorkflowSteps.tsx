"use client";

import { motion } from "framer-motion";
import { Globe, LineChart, Rocket } from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";
import { useI18n } from "@/components/providers/I18nProvider";

const stepIcons = [Globe, LineChart, Rocket];

export default function WorkflowSteps() {
  const { t } = useI18n();

  const steps = [
    {
      step: t("marketing.workflow.step1Label"),
      title: t("marketing.workflow.step1Title"),
      description: t("marketing.workflow.step1Desc"),
      icon: stepIcons[0],
    },
    {
      step: t("marketing.workflow.step2Label"),
      title: t("marketing.workflow.step2Title"),
      description: t("marketing.workflow.step2Desc"),
      icon: stepIcons[1],
    },
    {
      step: t("marketing.workflow.step3Label"),
      title: t("marketing.workflow.step3Title"),
      description: t("marketing.workflow.step3Desc"),
      icon: stepIcons[2],
    },
  ];

  return (
    <section className="section-padding relative">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">{t("marketing.workflow.badge")}</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mt-4">
            {t("marketing.workflow.title")}{" "}
            <span className="gold-gradient-text">{t("marketing.workflow.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((item, i) => (
            <motion.div
              key={item.title}
              className="glow-card hover-lift p-6 sm:p-8 relative min-h-[280px] flex flex-col"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="light-leak light-leak-orange w-32 h-32 -top-8 -right-8 opacity-60" />
              <div className="light-leak light-leak-red w-24 h-24 -bottom-6 -left-6 opacity-40" />

              <div className="glow-card-inner flex flex-col flex-1">
                <GlowIcon icon={item.icon} size={20} className="mb-6" />
                <p className="text-xs font-semibold text-accent-brand uppercase tracking-wider">{item.step}</p>
                <h3 className="text-xl font-bold text-white mt-2 mb-3">{item.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed flex-1">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
