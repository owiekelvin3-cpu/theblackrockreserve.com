"use client";

import { motion, type Variants } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
};

type VariantName = "fadeUp" | "fadeIn" | "scaleIn" | "slideLeft" | "slideRight";

const variants: Record<VariantName, Variants> = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideLeft,
  slideRight,
};

interface AnimateInProps {
  children: React.ReactNode;
  className?: string;
  variant?: VariantName;
  delay?: number;
  as?: "div" | "section" | "article";
}

export function AnimateIn({
  children,
  className = "",
  variant = "fadeUp",
  delay = 0,
  as = "div",
}: AnimateInProps) {
  const Tag = motion[as];

  return (
    <Tag
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants[variant]}
      transition={{ delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}

export function StaggerIn({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const cardHover = {
  whileHover: { y: -6, transition: { duration: 0.25 } },
  whileTap: { scale: 0.98 },
};
