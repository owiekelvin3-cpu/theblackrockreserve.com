"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

export type CashFlowMonth = {
  month: string;
  value: number;
  inflow: number;
  outflow: number;
  tooltipDate: string;
};

const DISPLAY_MONTHS = 7;

function hasRealActivity(data: CashFlowMonth[] | undefined | null): boolean {
  return Array.isArray(data) && data.some((m) => m.value > 0 || m.inflow > 0 || m.outflow > 0);
}

function buildChartRows(data: CashFlowMonth[] | undefined | null): CashFlowMonth[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  return data
    .filter((row) => row.value > 0 || row.inflow > 0 || row.outflow > 0)
    .slice(-DISPLAY_MONTHS);
}

function buildYScale(peak: number) {
  if (peak <= 0) return { yMax: 1000, yTicks: [0, 200, 400, 600, 800, 1000] };
  const step = peak <= 10000 ? 2000 : 10000;
  const yMax = Math.max(Math.ceil(peak / step) * step, step);
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((i * yMax) / 5));
  return { yMax, yTicks };
}

const TOOLTIP_MARGIN = 8;
const TOOLTIP_GAP = 10;

type TooltipPosition = { left: number; top: number };

function measureTooltipSize(tooltip: HTMLElement) {
  return {
    width: Math.max(tooltip.offsetWidth, tooltip.scrollWidth, 176),
    height: Math.max(tooltip.offsetHeight, tooltip.scrollHeight, 100),
  };
}

function clampTooltipPosition(
  anchorX: number,
  anchorY: number,
  tooltipWidth: number,
  tooltipHeight: number,
  containerRect: DOMRect,
  barIndex: number,
  barCount: number
): TooltipPosition {
  const containerW = containerRect.width;
  const containerH = containerRect.height;
  const viewportMargin = TOOLTIP_MARGIN;

  let top = anchorY - tooltipHeight - TOOLTIP_GAP;
  if (top < viewportMargin) {
    top = anchorY + TOOLTIP_GAP + 8;
  }
  if (top + tooltipHeight > containerH - viewportMargin) {
    top = Math.max(viewportMargin, containerH - viewportMargin - tooltipHeight);
  }

  const topViewport = containerRect.top + top;
  if (topViewport < viewportMargin) {
    top = viewportMargin - containerRect.top;
  }
  if (topViewport + tooltipHeight > window.innerHeight - viewportMargin) {
    top = window.innerHeight - viewportMargin - tooltipHeight - containerRect.top;
  }

  const isRightEdge = barIndex >= barCount - 2;
  const isLeftEdge = barIndex <= 1;

  let left = anchorX - tooltipWidth / 2;
  if (isRightEdge) {
    left = anchorX - tooltipWidth + 6;
  } else if (isLeftEdge) {
    left = anchorX - 6;
  }

  const minAbsLeft = Math.max(viewportMargin, containerRect.left + viewportMargin);
  const maxAbsLeft = Math.min(
    window.innerWidth - viewportMargin - tooltipWidth,
    containerRect.left + containerW - viewportMargin - tooltipWidth
  );
  const absLeft = containerRect.left + left;
  const clampedAbsLeft = Math.min(Math.max(absLeft, minAbsLeft), Math.max(minAbsLeft, maxAbsLeft));

  return { left: clampedAbsLeft - containerRect.left, top };
}

function roundedBarPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h / 2);
  return [
    `M ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    `L ${x} ${y + h}`,
    "Z",
  ].join(" ");
}

export default function CashFlowPanel({ data }: { data: CashFlowMonth[] }) {
  const { t, formatCurrency } = useI18n();
  const [chartMode, setChartMode] = useState<"monthly" | "yearly">("yearly");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition>({ left: 0, top: 0 });
  const [tooltipReady, setTooltipReady] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const hasData = hasRealActivity(data);
  const chartData = useMemo(() => buildChartRows(data), [data]);

  const peakMonth = useMemo(() => {
    if (chartData.length === 0) return "";
    const peak = [...chartData].sort((a, b) => b.value - a.value)[0];
    return peak?.month ?? "";
  }, [chartData]);

  const activeMonth =
    selectedMonth && chartData.some((m) => m.month === selectedMonth) ? selectedMonth : peakMonth;

  const cashFlowTotal = useMemo(() => {
    const source = Array.isArray(data) ? data : [];
    if (chartMode === "yearly") {
      return source.reduce((s, m) => s + (m.inflow - m.outflow), 0);
    }
    const current = chartData[chartData.length - 1];
    return current ? current.inflow - current.outflow : 0;
  }, [data, chartData, chartMode]);

  const activeIndex = chartData.findIndex((m) => m.month === activeMonth);
  const highlightIndex = hoveredIndex ?? (activeIndex >= 0 ? activeIndex : 0);

  const peakValue = Math.max(...chartData.map((m) => m.value), 0);
  const { yMax, yTicks } = buildYScale(peakValue);

  const handleBarEnter = useCallback((index: number, month: string) => {
    setHoveredIndex(index);
    setSelectedMonth(month);
  }, []);

  const chartW = 520;
  const chartH = 220;
  const padL = 44;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const barGap = 10;
  const barW = chartData.length > 0 ? (plotW - barGap * (chartData.length - 1)) / chartData.length : 0;
  const minBarH = 8;

  const getBarAnchor = useCallback(
    (index: number) => {
      const row = chartData[index];
      if (!row) return { x: 0, y: 0 };
      const displayVal = Math.max(row.value, 0);
      const barH = Math.max((displayVal / yMax) * plotH, minBarH);
      const x = padL + index * (barW + barGap);
      const barTop = padT + plotH - barH;
      return {
        x: x + barW / 2,
        y: barTop,
      };
    },
    [chartData, yMax, plotH, padL, barW, barGap, minBarH, padT]
  );

  const updateTooltipPosition = useCallback(
    (index: number) => {
      const container = chartRef.current;
      const tooltip = tooltipRef.current;
      if (!container || !tooltip) return;

      const containerRect = container.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const anchor = getBarAnchor(index);
      const anchorX = (anchor.x / chartW) * containerRect.width;
      const anchorY = (anchor.y / chartH) * containerRect.height;
      const { width: tipW, height: tipH } = measureTooltipSize(tooltip);

      setTooltipPos(
        clampTooltipPosition(
          anchorX,
          anchorY,
          tipW,
          tipH,
          containerRect,
          index,
          chartData.length
        )
      );
      setTooltipReady(true);
    },
    [getBarAnchor, chartData.length]
  );

  useLayoutEffect(() => {
    if (hoveredIndex === null) {
      setTooltipReady(false);
      return;
    }

    updateTooltipPosition(hoveredIndex);
    const raf1 = requestAnimationFrame(() => updateTooltipPosition(hoveredIndex));
    const raf2 = requestAnimationFrame(() => {
      requestAnimationFrame(() => updateTooltipPosition(hoveredIndex));
    });

    const container = chartRef.current;
    const onResize = () => updateTooltipPosition(hoveredIndex);
    window.addEventListener("resize", onResize);

    if (!container) {
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        window.removeEventListener("resize", onResize);
      };
    }

    const observer = new ResizeObserver(() => updateTooltipPosition(hoveredIndex));
    observer.observe(container);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, [hoveredIndex, updateTooltipPosition, chartData, chartMode]);

  return (
    <div className="cash-flow-card w-full">
      <div className="cash-flow-card-glow" aria-hidden />

      <div className="cash-flow-header">
        <div className="cash-flow-header-main">
          <p className="cash-flow-label">{t("dashboard.cashFlow")}</p>
          <p className="cash-flow-total">
            {hasData ? formatCurrency(cashFlowTotal) : "—"}
          </p>
        </div>
        <div className="cash-flow-toggle" role="group" aria-label="Cash flow period">
          <button
            type="button"
            onClick={() => setChartMode("monthly")}
            className={cn(
              "cash-flow-toggle-btn",
              chartMode === "monthly" && "cash-flow-toggle-btn-active"
            )}
          >
            {t("dashboard.monthly")}
          </button>
          <button
            type="button"
            onClick={() => setChartMode("yearly")}
            className={cn(
              "cash-flow-toggle-btn",
              chartMode === "yearly" && "cash-flow-toggle-btn-active"
            )}
          >
            {t("dashboard.yearly")}
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="cash-flow-chart cash-flow-empty flex flex-col items-center justify-center py-12 px-6 text-center min-h-[220px]">
          <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center mb-4">
            <BarChart3 size={22} className="text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary">{t("dashboard.noCashFlow")}</p>
          <p className="text-xs text-text-muted mt-1 max-w-xs">{t("dashboard.noCashFlowDesc")}</p>
        </div>
      ) : (
        <div
          ref={chartRef}
          className="cash-flow-chart"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="cash-flow-svg"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={t("dashboard.cashFlow")}
          >
            <defs>
              <linearGradient id="cf-active-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9A5C" />
                <stop offset="40%" stopColor="#FF5F05" />
                <stop offset="100%" stopColor="#C43200" />
              </linearGradient>
              <linearGradient id="cf-inactive-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(70,70,76,0.55)" />
                <stop offset="100%" stopColor="rgba(38,38,42,0.35)" />
              </linearGradient>
              <filter id="cf-bar-glow" x="-40%" y="-60%" width="180%" height="200%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#FF5F05" floodOpacity="0.55" />
              </filter>
            </defs>

            <g className="cash-flow-grid" aria-hidden>
              {yTicks.map((tick) => {
                const y = padT + plotH - (tick / yMax) * plotH;
                const isBaseline = tick === 0;
                return (
                  <line
                    key={`h-${tick}`}
                    className={cn("cash-flow-grid-line", isBaseline && "cash-flow-grid-line-baseline")}
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                  />
                );
              })}
              {chartData.map((row, i) => {
                const x = padL + i * (barW + barGap) + barW / 2;
                return (
                  <line
                    key={`v-${row.month}`}
                    className="cash-flow-grid-line cash-flow-grid-line-vertical"
                    x1={x}
                    y1={padT}
                    x2={x}
                    y2={padT + plotH}
                  />
                );
              })}
            </g>

            {yTicks.map((tick) => {
              const y = padT + plotH - (tick / yMax) * plotH;
              return (
                <text
                  key={`label-${tick}`}
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="cash-flow-axis-label"
                >
                  {tick >= 1000 ? `${tick / 1000}k` : tick}
                </text>
              );
            })}

            {chartData.map((row, i) => {
              const displayVal = Math.max(row.value, 0);
              const barH =
                displayVal > 0 ? Math.max((displayVal / yMax) * plotH, minBarH) : 0;
              const x = padL + i * (barW + barGap);
              const y = padT + plotH - barH;
              const isActive = i === highlightIndex;
              const r = Math.min(14, barW / 2);

              return (
                <g
                  key={row.month}
                  className="cash-flow-bar-group"
                  onMouseEnter={() => handleBarEnter(i, row.month)}
                  onFocus={() => handleBarEnter(i, row.month)}
                  style={{ cursor: "pointer" }}
                >
                  <rect
                    x={x - 4}
                    y={padT}
                    width={barW + 8}
                    height={plotH}
                    fill="transparent"
                  />
                  {barH > 0 && (
                    <motion.path
                      d={roundedBarPath(x, y, barW, barH, r)}
                      fill={isActive ? "url(#cf-active-grad)" : "url(#cf-inactive-grad)"}
                      filter={isActive ? "url(#cf-bar-glow)" : undefined}
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ delay: 0.08 + i * 0.07, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      style={{ transformOrigin: `${x + barW / 2}px ${padT + plotH}px` }}
                    />
                  )}
                  {isActive && barH > 0 && (
                    <>
                      <circle
                        cx={x + barW / 2}
                        cy={y}
                        r={7}
                        fill="rgba(255, 95, 5, 0.35)"
                        className="cash-flow-bar-glow"
                      />
                      <circle
                        cx={x + barW / 2}
                        cy={y}
                        r={4}
                        fill="#ffffff"
                        stroke="#FF5F05"
                        strokeWidth={1.5}
                      />
                    </>
                  )}
                  <text
                    x={x + barW / 2}
                    y={chartH - 6}
                    textAnchor="middle"
                    className={cn("cash-flow-month-label", isActive && "cash-flow-month-label-active")}
                  >
                    {row.month}
                  </text>
                </g>
              );
            })}
          </svg>

          <AnimatePresence>
            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <motion.div
                ref={tooltipRef}
                className="cash-flow-floating-tooltip"
                style={{
                  left: tooltipPos.left,
                  top: tooltipPos.top,
                  opacity: tooltipReady ? 1 : 0,
                }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: tooltipReady ? 1 : 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="cash-flow-tooltip-date">{chartData[hoveredIndex].tooltipDate}</p>
                <div className="cash-flow-tooltip-row">
                  <span>{t("dashboard.cashFlow")}</span>
                  <span className="cash-flow-tooltip-value">
                    {formatCurrency(
                      chartData[hoveredIndex].inflow - chartData[hoveredIndex].outflow
                    )}
                  </span>
                </div>
                <div className="cash-flow-tooltip-row">
                  <span>{t("dashboard.inflow")}</span>
                  <span className="cash-flow-tooltip-value">
                    {formatCurrency(chartData[hoveredIndex].inflow)}
                  </span>
                </div>
                <div className="cash-flow-tooltip-row">
                  <span>{t("dashboard.outflow")}</span>
                  <span className="cash-flow-tooltip-value cash-flow-tooltip-outflow">
                    {chartData[hoveredIndex].outflow > 0
                      ? `-${formatCurrency(chartData[hoveredIndex].outflow)}`
                      : formatCurrency(0)}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
