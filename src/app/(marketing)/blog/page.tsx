"use client";

import MarketingImage from "@/components/ui/MarketingImage";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { blogPosts } from "@/lib/blog-posts";

export default function BlogPage() {
  return (
    <section className="section-padding pt-32">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/#blog"
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent-brand transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <motion.div
          className="text-center max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="pill-label mb-4">Resources</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-4">
            Latest from <span className="gold-gradient-text">Our Blog</span>
          </h1>
          <p className="mt-4 text-text-secondary text-sm sm:text-base">
            Insights on banking, investing, security, and wealth management from the Blackrock Reserve team.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {blogPosts.map((article, i) => (
            <motion.article
              key={article.slug}
              className="glow-card hover-lift overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-accent-brand">
                    {article.category}
                  </span>
                  <time className="text-[10px] text-text-muted">
                    {new Date(article.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </time>
                </div>
                <h2 className="mt-2 text-sm font-semibold text-white group-hover:text-accent-brand transition-colors">
                  {article.title}
                </h2>
                <p className="mt-2 text-xs text-text-muted leading-relaxed line-clamp-3">{article.excerpt}</p>
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
