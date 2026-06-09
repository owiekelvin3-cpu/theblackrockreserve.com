"use client";

import { motion } from "framer-motion";
import {
  Shield, Globe, Zap, CreditCard, PieChart, Headphones,
} from "lucide-react";
import GlowIcon from "@/components/ui/GlowIcon";

const solutions = [
  { icon: Shield, title: "Bank-Grade Security", description: "2FA, biometrics, and real-time fraud detection." },
  { icon: Globe, title: "Global Transfers", description: "Send money to 50+ countries with competitive rates." },
  { icon: Zap, title: "Instant Deposits", description: "Fund your account quickly with Bitcoin deposits." },
  { icon: CreditCard, title: "Smart Cards", description: "Virtual and physical cards with spending controls." },
  { icon: PieChart, title: "Portfolio Tracking", description: "Monitor all your investments in one dashboard." },
  { icon: Headphones, title: "24/7 Support", description: "AI assistant and human experts always available." },
];

export default function SolutionsGrid() {
  return (
    <section className="section-padding relative">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Complete Financial <span className="gold-gradient-text">Solutions</span>
          </h2>
          <p className="mt-3 text-sm text-text-secondary max-w-lg mx-auto">
            Everything you need to manage, grow, and protect your wealth.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {solutions.map((item, i) => (
            <motion.div
              key={item.title}
              className="glow-card hover-lift p-6 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="glow-card-inner flex gap-4">
                <GlowIcon icon={item.icon} size={18} className="shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
