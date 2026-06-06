"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  { name: "Sarah Chen", role: "Tech Executive, San Francisco", avatar: "SC", rating: 5, text: "Platinum Crest transformed how I manage my wealth. The investment tools rival anything I've used on Wall Street." },
  { name: "Marcus Williams", role: "Real Estate Investor, Miami", avatar: "MW", rating: 5, text: "Instant transfers, beautiful interface, and the security features give me complete peace of mind." },
  { name: "Elena Rodriguez", role: "Startup Founder, Austin", avatar: "ER", rating: 5, text: "Finally, a bank that understands entrepreneurs. The business account features are exactly what I needed." },
  { name: "James Okonkwo", role: "Portfolio Manager, London", avatar: "JO", rating: 5, text: "The wealth analytics dashboard is exceptional. I can track all my assets in one place with real-time data." },
  { name: "Priya Sharma", role: "Physician, New York", avatar: "PS", rating: 5, text: "Setting up my account took minutes. The KYC process was smooth and I was banking the same day." },
];

export default function Testimonials() {
  return (
    <section className="section-padding overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="pill-label mb-4">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-4">
            Trusted by <span className="gold-gradient-text">Leaders</span>
          </h2>
        </motion.div>

        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="min-w-[300px] sm:min-w-[360px] snap-start glow-card hover-lift p-6 relative"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="light-leak light-leak-orange w-16 h-16 -top-2 -right-2 opacity-30" />
              <div className="glow-card-inner">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} className="fill-accent-brand text-accent-brand" />
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full brand-gradient-bg flex items-center justify-center text-white text-xs font-bold shadow-brand">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.role}</p>
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
