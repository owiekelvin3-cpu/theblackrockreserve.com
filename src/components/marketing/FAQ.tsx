"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { cardHover } from "@/components/ui/AnimateIn";
import { useI18n } from "@/components/providers/I18nProvider";

export default function FAQ() {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(0);

  const faqs = [
    { q: t("marketing.faq.q1"), a: t("marketing.faq.a1") },
    { q: t("marketing.faq.q2"), a: t("marketing.faq.a2") },
    { q: t("marketing.faq.q3"), a: t("marketing.faq.a3") },
    { q: t("marketing.faq.q4"), a: t("marketing.faq.a4") },
    { q: t("marketing.faq.q5"), a: t("marketing.faq.a5") },
  ];

  return (
    <section className="section-padding">
      <div className="mx-auto max-w-3xl">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">{t("marketing.faq.badge")}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-4">
            {t("marketing.faq.title")}{" "}
            <span className="gold-gradient-text">{t("marketing.faq.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                variants={cardHover}
                initial="rest"
                whileHover="hover"
                className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-text-primary text-sm sm:text-base">{faq.q}</span>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "shrink-0 text-text-muted transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="px-5 pb-5 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
