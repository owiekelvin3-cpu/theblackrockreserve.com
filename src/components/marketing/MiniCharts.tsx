"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

const REVENUE_VALUES = [42, 58, 72, 51, 64, 59, 68];
const REVENUE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function RevenueBarChart({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const w = 320;
  const h = 120;
  const max = Math.max(...REVENUE_VALUES);
  const peak = max;
  const barW = w / REVENUE_VALUES.length - 6;

  return (
    <div
      className={`relative w-full h-full group/chart ${className}`}
      onMouseLeave={() => setHovered(null)}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        {REVENUE_VALUES.map((v, i) => {
          const barH = (v / max) * (h - 24);
          const x = i * (barW + 6) + 3;
          const isPeak = v === peak;
          const isHovered = hovered === i;
          const isActive = isHovered || (hovered === null && isPeak);

          return (
            <g key={REVENUE_DAYS[i]}>
              <motion.rect
                x={x - 2}
                y={0}
                width={barW + 4}
                height={h - 18}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHovered(i)}
              />
              <motion.rect
                x={x}
                y={h - 18 - barH}
                width={barW}
                height={barH}
                rx="3"
                fill={isActive ? BRAND : MUTED}
                initial={animate ? { scaleY: 0 } : false}
                animate={{
                  scaleY: animate ? 1 : 1,
                  fill: isActive ? BRAND : MUTED,
                  filter: isHovered
                    ? "drop-shadow(0 0 8px rgba(255,95,5,0.8))"
                    : isPeak
                      ? "drop-shadow(0 0 4px rgba(255,95,5,0.4))"
                      : "drop-shadow(0 0 0px transparent)",
                }}
                transition={{
                  scaleY: { delay: animate ? 0.8 + i * 0.07 : 0, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                  fill: { duration: 0.2 },
                  filter: { duration: 0.2 },
                }}
                style={{ transformOrigin: `${x + barW / 2}px ${h - 18}px` }}
                whileHover={{ scaleY: 1.08 }}
              />
              <motion.text
                x={x + barW / 2}
                y={h - 4}
                textAnchor="middle"
                fill={isHovered ? BRAND : "#71717a"}
                fontSize="9"
                fontWeight={isHovered ? 600 : 400}
                initial={animate ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: animate ? 1 + i * 0.05 : 0, duration: 0.3 }}
              >
                {REVENUE_DAYS[i]}
              </motion.text>
            </g>
          );
        })}
      </svg>

      <AnimatePresence>
        {hovered !== null && (
          <motion.div
            key={hovered}
            className="absolute pointer-events-none z-10 px-2.5 py-1 rounded-lg bg-bg-tertiary border border-accent-brand/40 text-xs font-mono font-semibold text-white shadow-[0_0_20px_rgba(255,95,5,0.35)]"
            style={{
              left: `${((hovered * (barW + 6) + 3 + barW / 2) / w) * 100}%`,
              top: `${((h - 18 - (REVENUE_VALUES[hovered] / max) * (h - 24) - 28) / h) * 100}%`,
              transform: "translateX(-50%)",
            }}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            ${REVENUE_VALUES[hovered]}k
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
