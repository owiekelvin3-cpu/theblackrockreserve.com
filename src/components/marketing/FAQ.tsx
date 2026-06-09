"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "How do I open an account with Blackrock Reserve?",
    a: "Register online in minutes. Complete identity verification, fund your account via Bitcoin deposit, and start banking the same day.",
  },
  {
    q: "Is my money safe and insured?",
    a: "Yes. Blackrock Reserve is FDIC insured. Deposits are protected up to $250,000 per depositor with bank-grade encryption and 2FA.",
  },
  {
    q: "What investment options are available?",
    a: "Access stocks, ETFs, portfolio analytics, and capital markets tools from your dashboard with real-time performance tracking.",
  },
  {
    q: "How do deposits and withdrawals work?",
    a: "Deposit via Bitcoin with proof upload for admin review. Withdrawals support multiple methods with real-time balance updates.",
  },
  {
    q: "Can I get dedicated support?",
    a: "Premium and Elite plans include priority support. All members get 24/7 AI assistance plus human support during business hours.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section-padding">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">FAQ</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-4">
            Frequently Asked <span className="gold-gradient-text">Questions</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.q}
              className="glow-card overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="text-sm font-medium text-white">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={cn(
                    "text-text-muted shrink-0 transition-transform duration-300",
                    open === i && "rotate-180 text-accent-brand"
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-text-secondary leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
