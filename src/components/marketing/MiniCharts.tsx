"use client";

import { motion } from "framer-motion";
import RevenueFlowChart from "@/components/charts/RevenueFlowChart";

const BRAND = "#ff5f05";
const MUTED = "#3a3a3a";

export function MiniLineChart({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  const points = [20, 35, 28, 50, 42, 65, 58, 80];
  const w = 200;
  const h = 60;
  const max = Math.max(...points);
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (v / max) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-full ${className}`} preserveAspectRatio="none">
      <motion.polyline
        points={coords}
        fill="none"
        stroke={BRAND}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { opacity: 0 } : false}
        whileInView={animate ? { opacity: 1 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

export function MiniBarChart({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  const values = [30, 45, 38, 62, 55, 90, 72];
  const w = 200;
  const h = 60;
  const max = Math.max(...values);
  const barW = w / values.length - 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-full ${className}`} preserveAspectRatio="none">
      {values.map((v, i) => {
        const barH = (v / max) * (h - 8);
        const x = i * (barW + 4) + 2;
        const isPeak = v === max;
        return (
          <motion.rect
            key={i}
            x={x}
            y={h - barH}
            width={barW}
            height={barH}
            rx="2"
            fill={isPeak ? BRAND : MUTED}
            initial={animate ? { scaleY: 0, opacity: 0 } : false}
            whileInView={animate ? { scaleY: 1, opacity: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${x + barW / 2}px ${h}px` }}
          />
        );
      })}
    </svg>
  );
}

export function RevenueBarChart({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  return <RevenueFlowChart className={className} animate={animate} />;
}
