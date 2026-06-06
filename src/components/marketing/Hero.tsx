"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

const DashboardPreview = dynamic(() => import("./DashboardPreview"), {
  ssr: false,
  loading: () => <div className="mx-auto max-w-5xl h-[280px] rounded-3xl bg-white/5 animate-pulse border border-white/10" />,
});

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden">
      <div className="neon-streak top-[20%] left-[-5%] w-[110%] h-24 opacity-40" />
      <div className="neon-streak top-[55%] right-[-10%] w-[80%] h-16 opacity-25 rotate-6" />
      <div className="brand-horizon top-[25%]" />
      <div className="brand-arc" style={{ top: "48%" }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-36 pb-16 text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="pill-label mb-8 mx-auto"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent-brand animate-pulseGlow mr-2 inline-block" />
          Optimize Your Wealth
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight text-balance max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Turn Your Finances Into{" "}
          <span className="gold-gradient-text">Smart Growth</span>
        </motion.h1>

        <motion.p
          className="mt-6 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Premium digital banking, smart investments, and wealth management — all in one secure platform.
        </motion.p>

        <motion.div
          className="mt-10 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="glow-card p-2 flex flex-col sm:flex-row gap-2">
            <div className="glow-card-inner flex-1 flex items-center">
              <input
                type="email"
                placeholder="Enter your email"
                className="input-glass w-full px-5 py-3.5 text-sm bg-transparent border-0 focus:shadow-none"
              />
            </div>
            <Link href="/register" className="shrink-0">
              <Button size="lg" className="rounded-full w-full sm:w-auto px-8">
                Get Started <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button variant="outline" size="sm" className="rounded-full">Open Account</Button>
            </Link>
            <span className="text-xs text-text-muted">Free to open your account</span>
          </div>
        </motion.div>

        <div className="mt-16 lg:mt-20">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
