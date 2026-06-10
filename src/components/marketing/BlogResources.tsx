"use client";

import MarketingImage from "@/components/ui/MarketingImage";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cardHover } from "@/components/ui/AnimateIn";
import { blogPosts } from "@/lib/blog-posts";

const featuredPosts = blogPosts.slice(0, 3);

export default function BlogResources() {
  return (
    <section id="blog" className="section-padding scroll-mt-28">
      <div className="mx-auto max-w-7xl">
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
          {featuredPosts.map((article, i) => (
            <motion.article
              key={article.slug}
              className="glow-card hover-lift overflow-hidden group cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              {...cardHover}
            >
              <Link href="/blog" className="block">
                <div className="relative h-44 sm:h-52 overflow-hidden">
                  <MarketingImage
                    src={article.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/90 via-bg-primary/20 to-transparent" />
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
              </Link>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-text-primary hover:border-accent-brand/40 hover:bg-accent-brand/10 hover:text-white transition-all"
          >
            View more
            <ArrowRight size={16} className="text-accent-brand" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
