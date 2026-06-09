"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { cardHover } from "@/components/ui/AnimateIn";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Essential banking for getting started",
    features: ["Checking & savings accounts", "Mobile app access", "Secure deposits", "Standard support"],
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "Full-featured banking and investing",
    features: ["Everything in Starter", "Investment trading", "Priority support", "Wealth analytics", "Global transfers"],
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    description: "White-glove wealth management",
    features: ["Everything in Pro", "Dedicated advisor", "Tax optimization", "Estate planning tools", "Concierge service"],
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">Pricing</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-4">
            Flexible Pricing Options for{" "}
            <span className="gold-gradient-text">Every Team</span>
          </h2>
          <p className="mt-4 text-sm text-text-secondary max-w-lg mx-auto">
            Choose the plan that matches your financial goals. No hidden fees.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glow-card hover-lift p-6 sm:p-8 relative ${
                plan.popular ? "border-accent-brand/40 shadow-brand md:scale-[1.02]" : ""
              }`}
              {...cardHover}
            >
              {plan.popular && (
                <>
                  <div className="light-leak light-leak-orange w-full h-full inset-0 opacity-25" />
                  <Badge variant="gold" className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    Most Popular
                  </Badge>
                </>
              )}
              <div className="glow-card-inner">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-bold gold-gradient-text">{plan.price}</span>
                  <span className="text-text-muted text-sm">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-text-secondary">
                      <div className="icon-ring h-5 w-5 shrink-0">
                        <Check size={10} className="text-accent-brand" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block mt-8">
                  <Button variant={plan.popular ? "gold" : "outline"} className="w-full rounded-full">
                    Choose Plan
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
