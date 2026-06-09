"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import DashboardPreview from "@/components/marketing/DashboardPreview";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center overflow-hidden">
      <div className="hero-halo" />
      <div className="hero-halo-arc" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 pb-12 text-center w-full animate-fade-in">
        <div className="pill-label mb-6 mx-auto">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-brand animate-pulseGlow mr-2 inline-block" />
          Optimize Your Workflow
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold text-white leading-[1.1] tracking-tight text-balance max-w-4xl mx-auto">
          Elevate Your Business Using{" "}
          <span className="gold-gradient-text">AI-Driven Automation</span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
          Premium digital banking, smart investments, and wealth management — powered by intelligent
          automation in one secure platform.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="rounded-full px-8 min-w-[180px]">
              Start Free Trial <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="rounded-full px-8 min-w-[180px]">
              Book a Demo <ArrowRight size={18} />
            </Button>
          </Link>
        </div>

        <div className="mt-14 sm:mt-16 lg:mt-20">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
