"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function sparklinePoints(symbol: string, positive: boolean, width: number, height: number) {
  let seed = 2166136261;
  for (let i = 0; i < symbol.length; i += 1) {
    seed ^= symbol.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  const count = 18;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = ((seed % 1000) / 1000 - 0.5) * 0.38;
    const wave = Math.sin(i * 0.52 + (seed % 9) * 0.12) * 0.2;
    const trend = (i / (count - 1) - 0.48) * (positive ? 0.72 : -0.72);
    const t = 0.52 - trend - wave - noise;
    points.push({
      x: (i / (count - 1)) * width,
      y: Math.max(2.5, Math.min(height - 2.5, t * height)),
    });
  }
  return points;
}

export default function MarketSparkline({
  symbol,
  positive,
  className,
}: {
  symbol: string;
  positive: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const width = 104;
  const height = 34;
  const points = sparklinePoints(symbol, positive, width, height);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const fill = `${path} L${width} ${height} L0 ${height} Z`;
  const last = points[points.length - 1];
  const color = positive ? "#22c55e" : "#f43f5e";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <motion.path
        d={fill}
        fill={color}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.14 }}
        transition={{ duration: 0.6 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduced ? 1 : 0, opacity: 0.25 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: reduced ? 0 : 1.15, ease: [0.22, 1, 0.36, 1] }}
      />
      {last && (
        <motion.circle
          cx={last.x}
          cy={last.y}
          r="2.4"
          fill={color}
          initial={{ scale: 0 }}
          animate={reduced ? { scale: 1 } : { scale: [1, 1.45, 1], opacity: [1, 0.65, 1] }}
          transition={reduced ? { duration: 0.2 } : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </svg>
  );
}
