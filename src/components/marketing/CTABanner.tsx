"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import { fadeUp, stagger } from "@/components/ui/AnimateIn";
import { marketingImages } from "@/lib/marketing-images";

export default function CTABanner() {
  return (
    <section className="section-padding">
      <motion.div
        className="mx-auto max-w-5xl relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.01 }}
      >
        <Image
          src={marketingImages.officeWide}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 1024px"
        />
        <div className="absolute inset-0 brand-gradient-bg opacity-85" />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-black/20 blur-3xl" />

        <motion.div
          className="relative z-10 px-8 sm:px-14 py-12 sm:py-16 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight"
          >
            Ready to Elevate Your Business?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 text-sm sm:text-base text-white/80 max-w-xl mx-auto"
          >
            Join thousands of members who trust Blackrock Reserve with their wealth. Start your free trial today.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 font-semibold rounded-full px-8 py-4 text-base bg-white text-accent-brand hover:bg-white/90 min-w-[180px] transition-colors"
            >
              Get Started <ArrowRight size={18} />
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-8 border-white/30 text-white hover:bg-white/10 min-w-[180px]"
              >
                Contact Sales
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
