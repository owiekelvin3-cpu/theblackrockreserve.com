"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const articles = [
  {
    title: "The Future of AI in Digital Banking",
    category: "Insights",
    gradient: "from-accent-brand/40 via-accent-brand-red/20 to-transparent",
  },
  {
    title: "Building Wealth with Smart Automation",
    category: "Guide",
    gradient: "from-accent-brand-red/30 via-accent-brand/20 to-transparent",
  },
  {
    title: "Security Best Practices for Investors",
    category: "Security",
    gradient: "from-accent-brand/30 via-transparent to-accent-brand-red/20",
  },
];

export default function BlogResources() {
  return (
    <section id="blog" className="section-padding">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="pill-label mb-4">Resources</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-4">
            Latest from <span className="gold-gradient-text">Our Blog</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article, i) => (
            <motion.article
              key={article.title}
              className="glow-card hover-lift overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className={`h-44 sm:h-52 bg-gradient-to-br ${article.gradient} relative flex items-center justify-center`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(255,95,5,0.25),transparent_70%)]" />
                <div className="relative h-20 w-20 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[0, 1, 2, 3].map((d) => (
                      <span key={d} className="h-2 w-2 rounded-full bg-accent-brand/80" />
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-accent-brand">
                  {article.category}
                </span>
                <h3 className="mt-2 text-sm font-semibold text-white group-hover:text-accent-brand transition-colors">
                  {article.title}
                </h3>
                <span className="mt-3 inline-flex items-center gap-1 text-xs text-text-muted group-hover:text-white transition-colors">
                  Read more <ArrowRight size={12} />
                </span>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
