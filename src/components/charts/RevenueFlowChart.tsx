"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BRAND = "#ff5f05";
const MUTED = "#3a3a3a";
const LABEL_MUTED = "#71717a";

export type RevenueFlowTooltipLine = {
  label: string;
  value: string;
  accent?: boolean;
};

export type RevenueFlowDatum = {
  label: string;
  value: number;
  tooltipTitle?: string;
  tooltipLines?: RevenueFlowTooltipLine[];
};

const DEMO_DATA: RevenueFlowDatum[] = [
  { label: "Mon", value: 42 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 72 },
  { label: "Thu", value: 51 },
  { label: "Fri", value: 64 },
  { label: "Sat", value: 59 },
  { label: "Sun", value: 68 },
];

interface RevenueFlowChartProps {
  data?: RevenueFlowDatum[];
  animate?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export default function RevenueFlowChart({
  data,
  animate = false,
  formatValue = (v) => `$${Math.round(v)}k`,
  className = "",
}: RevenueFlowChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const points = useMemo(() => {
    const source = data?.length ? data : DEMO_DATA;
    const maxVal = Math.max(...source.map((d) => d.value), 1);
    return source.map((d) => ({
      ...d,
      displayValue: d.value > 0 ? d.value : maxVal * 0.12,
    }));
  }, [data]);

  const max = Math.max(...points.map((p) => p.displayValue), 1);
  const peakIdx = points.reduce((best, p, i) => (p.value >= points[best].value ? i : best), 0);

  const w = 320;
  const h = 120;
  const barW = w / points.length - 6;

  return (
    <div
      className={`relative w-full h-full min-h-[9rem] group/chart ${className}`}
      onMouseLeave={() => setHovered(null)}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
        {points.map((point, i) => {
          const barH = (point.displayValue / max) * (h - 24);
          const x = i * (barW + 6) + 3;
          const isPeak = i === peakIdx && point.value > 0;
          const isHovered = hovered === i;
          const isActive = isHovered || (hovered === null && isPeak);

          return (
            <g key={`${point.label}-${i}`}>
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
                height={Math.max(barH, 6)}
                rx="3"
                fill={isActive ? BRAND : MUTED}
                initial={animate ? { scaleY: 0 } : false}
                animate={{
                  scaleY: 1,
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
                fill={isHovered || isActive ? BRAND : LABEL_MUTED}
                fontSize="9"
                fontWeight={isHovered || isActive ? 600 : 400}
                initial={animate ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay: animate ? 1 + i * 0.05 : 0, duration: 0.3 }}
              >
                {point.label}
              </motion.text>
            </g>
          );
        })}
      </svg>

      <AnimatePresence>
        {hovered !== null && (
          <motion.div
            key={hovered}
            className="revenue-flow-tooltip absolute pointer-events-none z-10"
            style={{
              left: `${((hovered * (barW + 6) + 3 + barW / 2) / w) * 100}%`,
              top: `${((h - 18 - (points[hovered].displayValue / max) * (h - 24) - 36) / h) * 100}%`,
              transform:
                hovered <= 1
                  ? "translateX(-12%)"
                  : hovered >= points.length - 2
                    ? "translateX(-88%)"
                    : "translateX(-50%)",
            }}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {points[hovered].tooltipTitle && (
              <p className="revenue-flow-tooltip-title">{points[hovered].tooltipTitle}</p>
            )}
            {points[hovered].tooltipLines?.length ? (
              <div className="space-y-1">
                {points[hovered].tooltipLines!.map((line) => (
                  <div key={line.label} className="revenue-flow-tooltip-row">
                    <span>{line.label}</span>
                    <span className={line.accent ? "text-accent-brand" : ""}>{line.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="font-mono font-semibold text-white text-xs">
                {formatValue(points[hovered].value)}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
