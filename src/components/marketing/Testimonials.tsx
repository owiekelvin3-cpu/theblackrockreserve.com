"use client";

import MarketingImage from "@/components/ui/MarketingImage";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cardHover } from "@/components/ui/AnimateIn";
import { marketingImages } from "@/lib/marketing-images";

const testimonials = [
  { name: "Sarah Chen", role: "Tech Executive, San Francisco", photo: marketingImages.portraits.sarah, rating: 5, text: "Blackrock Reserve transformed how I manage my wealth. The investment tools rival anything I've used on Wall Street." },
  { name: "Marcus Williams", role: "Real Estate Investor, Miami", photo: marketingImages.portraits.marcus, rating: 5, text: "Instant transfers, beautiful interface, and the security features give me complete peace of mind." },
  { name: "Elena Rodriguez", role: "Startup Founder, Austin", photo: marketingImages.portraits.elena, rating: 5, text: "Finally, a bank that understands entrepreneurs. The business account features are exactly what I needed." },
  { name: "James Okonkwo", role: "Portfolio Manager, London", photo: marketingImages.portraits.james, rating: 5, text: "The wealth analytics dashboard is exceptional. I can track all my assets in one place with real-time data." },
  { name: "Priya Sharma", role: "Physician, New York", photo: marketingImages.portraits.priya, rating: 5, text: "Setting up my account took minutes. The KYC process was smooth and I was banking the same day." },
  { name: "Alex Turner", role: "CFO, Chicago", photo: marketingImages.portraits.alex, rating: 5, text: "The automation features saved our team hours every week. Best financial platform we've adopted." },
];

export default function Testimonials() {
  return (
    <section className="section-padding overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">Testimonials</span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-4">
            Trusted by Thousands of{" "}
            <span className="gold-gradient-text">Happy Users</span>
          </h2>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="glow-card hover-lift p-6 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              {...cardHover}
            >
              <div className="light-leak light-leak-orange w-16 h-16 -top-2 -right-2 opacity-30" />
              <div className="glow-card-inner">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <motion.div
                      key={j}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 + j * 0.05 }}
                    >
                      <Star size={14} className="fill-accent-brand text-accent-brand" />
                    </motion.div>
                  ))}
                </div>
                <p className="text-text-secondary text-sm leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 rounded-full overflow-hidden ring-2 ring-accent-brand/40 shadow-brand shrink-0">
                    <MarketingImage src={t.photo} alt={t.name} fill className="object-cover" sizes="36px" />
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
