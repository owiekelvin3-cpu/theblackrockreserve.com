"use client";

import MarketingImage from "@/components/ui/MarketingImage";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cardHover } from "@/components/ui/AnimateIn";
import { marketingImages } from "@/lib/marketing-images";
import { useI18n } from "@/components/providers/I18nProvider";

const testimonialMeta = [
  { name: "Sarah Chen", photo: marketingImages.portraits.sarah, roleKey: "marketing.testimonials.t1Role", textKey: "marketing.testimonials.t1Text" },
  { name: "Marcus Williams", photo: marketingImages.portraits.marcus, roleKey: "marketing.testimonials.t2Role", textKey: "marketing.testimonials.t2Text" },
  { name: "Elena Rodriguez", photo: marketingImages.portraits.elena, roleKey: "marketing.testimonials.t3Role", textKey: "marketing.testimonials.t3Text" },
  { name: "James Okonkwo", photo: marketingImages.portraits.james, roleKey: "marketing.testimonials.t4Role", textKey: "marketing.testimonials.t4Text" },
  { name: "Priya Sharma", photo: marketingImages.portraits.priya, roleKey: "marketing.testimonials.t5Role", textKey: "marketing.testimonials.t5Text" },
  { name: "Alex Turner", photo: marketingImages.portraits.alex, roleKey: "marketing.testimonials.t6Role", textKey: "marketing.testimonials.t6Text" },
];

export default function Testimonials() {
  const { t } = useI18n();

  return (
    <section className="section-padding overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">{t("marketing.testimonials.badge")}</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-4">
            {t("marketing.testimonials.title")}{" "}
            <span className="gold-gradient-text">{t("marketing.testimonials.titleHighlight")}</span>
          </h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonialMeta.map((item, i) => (
            <motion.div
              key={item.name}
              className="glow-card hover-lift p-6 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              {...cardHover}
            >
              <div className="light-leak light-leak-orange w-16 h-16 -top-2 -right-2 opacity-30" />
              <div className="glow-card-inner">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 + j * 0.05 }}
                    >
                      <Star size={14} className="fill-accent-brand text-accent-brand" />
                    </motion.div>
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">&ldquo;{t(item.textKey)}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-accent-brand/40 shadow-brand shrink-0">
                    <MarketingImage src={item.photo} alt={item.name} fill className="object-cover" sizes="36px" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{item.name}</p>
                    <p className="text-xs text-text-muted">{t(item.roleKey)}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
