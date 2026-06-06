"use client";

import { motion } from "framer-motion";
import { Globe, LineChart, Rocket } from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";

const steps = [
  {
    step: "Step 1",
    title: "Open Your Account",
    description: "Create your profile in minutes with a streamlined onboarding flow and instant account access.",
    icon: Globe,
  },
  {
    step: "Step 2",
    title: "Fund & Verify",
    description: "Securely link accounts, complete identity verification, and enable multi-factor protection.",
    icon: LineChart,
  },
  {
    step: "Step 3",
    title: "Grow Your Wealth",
    description: "Invest, transfer globally, and track performance with real-time analytics and AI insights.",
    icon: Rocket,
  },
];

export default function WorkflowSteps() {
  return (
    <section className="section-padding relative">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">Our Working Flow</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mt-4">
            Turn Your Goals Into <span className="gold-gradient-text">Financial Growth</span>
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
