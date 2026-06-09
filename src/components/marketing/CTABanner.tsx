"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";

export default function CTABanner() {
  return (
    <section className="section-padding">
      <motion.div
        className="mx-auto max-w-5xl relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="absolute inset-0 brand-gradient-bg opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-black/20 blur-3xl" />

        <div className="relative z-10 px-8 sm:px-14 py-12 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Ready to Elevate Your Business?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-white/80 max-w-xl mx-auto">
            Join thousands of members who trust Blackrock Reserve with their wealth. Start your free trial today.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="rounded-full px-8 bg-white text-accent-brand hover:bg-white/90 shadow-none min-w-[180px]">
                Get Started <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 border-white/30 text-white hover:bg-white/10 min-w-[180px]"
              >
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
