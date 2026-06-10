"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Twitter, Linkedin, Instagram } from "lucide-react";
import Logo, { LogoWordmark } from "./Logo";
import { fadeUp, stagger } from "@/components/ui/AnimateIn";

const products = [
  { label: "Smart Banking", href: "/features#banking" },
  { label: "Investments", href: "/investments" },
  { label: "Capital Markets", href: "/features#investments" },
  { label: "Wealth Analytics", href: "/features#analytics" },
];

const company = [
  { label: "About Us", href: "/about" },
  { label: "Careers", href: "/about#careers" },
  { label: "Press", href: "/about#press" },
  { label: "Contact", href: "/contact" },
];

const resources = [
  { label: "Blog", href: "/blog" },
  { label: "Features", href: "/features" },
  { label: "FAQ", href: "/#faq" },
];

const legal = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Disclosures", href: "/disclosures" },
];

const linkColumns = [
  { title: "Product", items: products },
  { title: "Company", items: company },
  { title: "Resources", items: resources },
  { title: "Legal", items: legal },
] as const;

export default function Footer() {
  return (
    <footer className="theme-footer relative overflow-hidden">
      <div className="theme-footer-inner mx-auto max-w-7xl">
        <motion.div
          className="footer-links-grid grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="footer-brand col-span-2 flex flex-col items-center text-center md:col-span-4 md:items-start md:text-left lg:col-span-1 space-y-4"
          >
            <Logo className="justify-center md:justify-start" />
            <p className="text-sm text-text-secondary leading-relaxed max-w-sm">
              Premium digital banking and wealth management for those who demand excellence.
            </p>
            <div className="flex gap-3">
              {[Twitter, Linkedin, Instagram].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  className="p-2 rounded-lg bg-white/5 text-text-muted hover:text-accent-brand hover:bg-accent-brand/10 transition-colors"
                  aria-label="Social"
                  whileHover={{ y: -3, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={18} />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {linkColumns.map((col) => (
            <motion.div key={col.title} variants={fadeUp} className="footer-link-col min-w-0">
              <h4 className="font-semibold text-text-primary mb-3 sm:mb-4 text-sm">{col.title}</h4>
              <ul className="space-y-2 sm:space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-text-secondary hover:text-accent-brand transition-colors break-words"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="footer-bottom mt-10 sm:mt-14 lg:mt-16 pt-8 border-t border-white/10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex flex-col items-center text-center px-1">
            <motion.div
              className="w-full max-w-full overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <LogoWordmark className="footer-wordmark opacity-90" />
            </motion.div>
            <p className="mt-5 sm:mt-6 text-sm text-text-muted text-balance">
              © {new Date().getFullYear()} Blackrock Reserve. All rights reserved.
            </p>
            <p className="mt-2 text-[11px] sm:text-xs text-text-muted text-balance leading-relaxed max-w-md">
              FDIC Insured · Member FDIC · Equal Housing Lender
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
