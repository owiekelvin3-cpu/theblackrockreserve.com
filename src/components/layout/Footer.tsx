"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Twitter, Linkedin, Instagram, ChevronDown } from "lucide-react";
import Logo, { LogoWordmark } from "./Logo";
import { fadeUp, stagger } from "@/components/ui/AnimateIn";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

type FooterLink = { labelKey: string; href: string };

type FooterColumn = {
  titleKey: string;
  items: FooterLink[];
};

export default function Footer() {
  const { t } = useI18n();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const products: FooterLink[] = [
    { labelKey: "footer.links.smartBanking", href: "/features#banking" },
    { labelKey: "footer.links.investments", href: "/investments" },
    { labelKey: "footer.links.capitalMarkets", href: "/features#investments" },
    { labelKey: "footer.links.wealthAnalytics", href: "/features#analytics" },
  ];

  const company: FooterLink[] = [
    { labelKey: "footer.links.aboutUs", href: "/about" },
    { labelKey: "footer.links.careers", href: "/about#careers" },
    { labelKey: "footer.links.press", href: "/about#press" },
    { labelKey: "footer.links.contact", href: "/contact" },
  ];

  const resources: FooterLink[] = [
    { labelKey: "footer.links.blog", href: "/blog" },
    { labelKey: "footer.links.features", href: "/features" },
    { labelKey: "footer.links.faq", href: "/#faq" },
  ];

  const legal: FooterLink[] = [
    { labelKey: "footer.links.privacyPolicy", href: "/privacy" },
    { labelKey: "footer.links.termsOfService", href: "/terms" },
    { labelKey: "footer.links.cookiePolicy", href: "/cookies" },
    { labelKey: "footer.links.disclosures", href: "/disclosures" },
  ];

  const linkColumns: FooterColumn[] = [
    { titleKey: "footer.product", items: products },
    { titleKey: "footer.company", items: company },
    { titleKey: "footer.resources", items: resources },
    { titleKey: "footer.legal", items: legal },
  ];

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const socialIcons = [Twitter, Linkedin, Instagram];

  return (
    <footer className="theme-footer relative overflow-hidden">
      <div className="theme-footer-inner mx-auto max-w-7xl">
        {/* Mobile: compact brand bar */}
        <div className="flex items-center justify-between gap-4 md:hidden mb-5">
          <Logo size="sm" className="shrink-0" />
          <div className="flex gap-1.5 shrink-0">
            {socialIcons.map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="p-2 rounded-lg bg-white/5 text-text-muted hover:text-accent-brand hover:bg-accent-brand/10 transition-colors"
                aria-label={t("footer.social")}
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <motion.div
          className="footer-links-grid grid gap-6 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-8 md:gap-y-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
        >
          {/* Desktop brand column */}
          <motion.div
            variants={fadeUp}
            className="footer-brand hidden md:flex flex-col items-start text-left lg:col-span-1 space-y-4"
          >
            <Logo className="justify-start" />
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-3">
              {socialIcons.map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  className="p-2 rounded-lg bg-white/5 text-text-muted hover:text-accent-brand hover:bg-accent-brand/10 transition-colors"
                  aria-label={t("footer.social")}
                  whileHover={{ y: -3, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={18} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Mobile: accordion link sections */}
          <div className="md:hidden col-span-full divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
            {linkColumns.map((col) => {
              const isOpen = openSections[col.titleKey] ?? false;
              return (
                <div key={col.titleKey}>
                  <button
                    type="button"
                    onClick={() => toggleSection(col.titleKey)}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left min-h-[48px]"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-text-primary text-sm">
                      {t(col.titleKey)}
                    </span>
                    <ChevronDown
                      size={18}
                      className={cn(
                        "text-text-muted shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden px-4 pb-3 space-y-2"
                      >
                        {col.items.map((item) => (
                          <li key={item.labelKey}>
                            <Link
                              href={item.href}
                              className="block py-1 text-sm text-text-secondary hover:text-accent-brand transition-colors"
                            >
                              {t(item.labelKey)}
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Desktop: link columns */}
          {linkColumns.map((col) => (
            <motion.div key={col.titleKey} variants={fadeUp} className="footer-link-col min-w-0 hidden md:block">
              <h4 className="font-semibold text-text-primary mb-3 sm:mb-4 text-sm">{t(col.titleKey)}</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.labelKey}>
                    <Link
                      href={item.href}
                      className="text-sm text-text-secondary hover:text-accent-brand transition-colors break-words"
                    >
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="footer-bottom mt-6 sm:mt-10 lg:mt-16 pt-5 sm:pt-8 border-t border-white/10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex flex-col items-center text-center px-1">
            <motion.div
              className="hidden sm:block w-full max-w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <LogoWordmark className="footer-wordmark opacity-90" />
            </motion.div>
            <p className="mt-0 sm:mt-6 text-xs sm:text-sm text-text-muted text-balance">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </p>
            <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-text-muted/80 text-balance leading-relaxed max-w-md px-2">
              {t("footer.disclaimer")}
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
