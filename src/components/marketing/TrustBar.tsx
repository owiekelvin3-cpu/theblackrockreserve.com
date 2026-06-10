"use client";

import { motion } from "framer-motion";

const logos = [
  "Logoipsum",
  "Logoipsum",
  "Logoipsum",
  "Logoipsum",
  "Logoipsum",
  "Logoipsum",
  "Logoipsum",
];

export default function TrustBar() {
  return (
    <section className="py-12 sm:py-16 border-y border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p
          className="text-center text-sm text-text-muted mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Trusted by <span className="text-white font-medium">10,000+</span> Teams Worldwide
        </motion.p>

        <motion.div
          className="stats-marquee-mask overflow-hidden"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="stats-marquee-track flex animate-marquee">
            {[...logos, ...logos].map((logo, i) => (
              <div key={i} className="stats-marquee-slide flex items-center px-8 sm:px-12">
                <span className="text-lg sm:text-xl font-bold text-white/25 tracking-tight whitespace-nowrap select-none">
                  {logo}
                </span>
                {i < logos.length * 2 - 1 && <div className="stats-marquee-divider" />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
