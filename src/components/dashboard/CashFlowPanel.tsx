"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { BarRectangleItem, BarShapeProps } from "recharts";
import ChartContainer from "@/components/ui/ChartContainer";
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
const DEFAULT_Y_MAX = 50000;
const MIN_BAR_PX = 10;

type ChartMode = "monthly" | "yearly";

function CashFlowBarShape(
  props: BarShapeProps & { activeMonth: string; activeGradId: string; inactiveGradId: string }
) {
  const { x = 0, y = 0, width = 0, height = 0, payload, activeMonth, activeGradId, inactiveGradId } = props;
  if (width <= 0) return null;

  const row = payload as CashFlowMonth | undefined;
  const barMonth = row?.month ?? "";
  const isActive = barMonth === activeMonth;
  const barHeight = Math.max(height, MIN_BAR_PX);
  const barY = height < MIN_BAR_PX ? y + height - MIN_BAR_PX : y;
  const r = Math.min(16, barHeight / 2.2, width / 2.2);

  return (
    <g className={cn("cash-flow-bar", isActive && "cash-flow-bar-active")}>
      <path
        d={`M ${x} ${barY + r} Q ${x} ${barY} ${x + r} ${barY} L ${x + width - r} ${barY} Q ${x + width} ${barY} ${x + width} ${barY + r} L ${x + width} ${barY + barHeight} L ${x} ${barY + barHeight} Z`}
        fill={isActive ? `url(#${activeGradId})` : `url(#${inactiveGradId})`}
        style={{ cursor: "pointer" }}
      />
      {isActive && (
        <>
          <circle
            cx={x + width / 2}
            cy={barY}
            r={8}
            fill="rgba(255, 95, 5, 0.4)"
            className="cash-flow-bar-glow"
          />
          <circle
            cx={x + width / 2}
            cy={barY}
            r={4.5}
            fill="#ffffff"
            stroke="#FF5F05"
            strokeWidth={1.5}
          />
        </>
      )}
    </g>
  );
}

type TooltipLabels = {
  cashFlow: string;
  inflow: string;
  outflow: string;
  format: (value: number) => string;
};

function CashFlowTooltip({
  active,
  payload,
  labels,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: CashFlowMonth }>;
  labels: TooltipLabels;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const net = row.inflow - row.outflow;

  return (
    <div className="cash-flow-tooltip">
      <p className="cash-flow-tooltip-date">{row.tooltipDate}</p>
      <div className="cash-flow-tooltip-row">
        <span>{labels.cashFlow}</span>
        <span className="cash-flow-tooltip-value">{labels.format(net)}</span>
      </div>
      <div className="cash-flow-tooltip-row">
        <span>{labels.inflow}</span>
        <span className="cash-flow-tooltip-value">{labels.format(row.inflow)}</span>
      </div>
      <div className="cash-flow-tooltip-row">
        <span>{labels.outflow}</span>
        <span className="cash-flow-tooltip-value cash-flow-tooltip-outflow">
          {row.outflow > 0 ? `-${labels.format(row.outflow)}` : labels.format(0)}
        </span>
      </div>
    </div>
  );
}

function buildYAxis(yMax: number) {
  const step = yMax / 5;
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round(i * step));
  return { yMax, ticks };
}

export default function CashFlowPanel({
  data,
}: {
  data: CashFlowMonth[];
}) {
  const { t, formatCurrency } = useI18n();
  const [chartMode, setChartMode] = useState<ChartMode>("yearly");
  const chartId = useId().replace(/:/g, "");
  const activeGradId = `cf-bar-active-${chartId}`;
  const inactiveGradId = `cf-bar-inactive-${chartId}`;
  const shadowFilterId = `cf-bar-shadow-${chartId}`;

  const chartData = useMemo(() => data.slice(0, DISPLAY_MONTHS), [data]);

  const peakMonth = useMemo(() => {
    const peak = [...chartData].sort((a, b) => b.value - a.value)[0];
    return peak?.month ?? chartData[0]?.month ?? "Jan";
  }, [chartData]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const activeMonth =
    selectedMonth && chartData.some((m) => m.month === selectedMonth)
      ? selectedMonth
      : peakMonth;

  const cashFlowTotal = useMemo(() => {
    if (chartMode === "yearly") {
      return data.reduce((s, m) => s + (m.inflow - m.outflow), 0);
    }
    const current = chartData[chartData.length - 1];
    return current ? current.inflow - current.outflow : 0;
  }, [data, chartData, chartMode]);

  const { yMax, ticks: yTicks } = useMemo(() => {
    const peak = Math.max(...chartData.map((m) => m.value), 0);
    if (peak === 0) return buildYAxis(DEFAULT_Y_MAX);
    const step = peak <= 10000 ? 2000 : 10000;
    const scaled = Math.ceil(peak / step) * step;
    return buildYAxis(Math.max(scaled, step));
  }, [chartData]);

  const tooltipLabels = useMemo(
    () => ({
      cashFlow: t("dashboard.cashFlow"),
      inflow: t("dashboard.inflow"),
      outflow: t("dashboard.outflow"),
      format: formatCurrency,
    }),
    [t, formatCurrency]
  );

  const renderBar = useCallback(
    (props: BarShapeProps) => (
      <CashFlowBarShape
        {...props}
        activeMonth={activeMonth}
        activeGradId={activeGradId}
        inactiveGradId={inactiveGradId}
      />
    ),
    [activeMonth, activeGradId, inactiveGradId]
  );

  const handleBarInteraction = useCallback((entry: BarRectangleItem) => {
    const row = entry?.payload as CashFlowMonth | undefined;
    if (row?.month) setSelectedMonth(row.month);
  }, []);

  return (
    <motion.div
      className="cash-flow-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="cash-flow-card-glow" aria-hidden />

      <div className="cash-flow-header">
        <div className="cash-flow-header-main">
          <p className="cash-flow-label">{t("dashboard.cashFlow")}</p>
          <p className="cash-flow-total">{formatCurrency(cashFlowTotal)}</p>
        </div>
        <div className="cash-flow-toggle" role="group" aria-label="Cash flow period">
          <button
            type="button"
            onClick={() => setChartMode("monthly")}
            className={cn("cash-flow-toggle-btn", chartMode === "monthly" && "cash-flow-toggle-btn-active")}
          >
            {t("dashboard.monthly")}
          </button>
          <button
            type="button"
            onClick={() => setChartMode("yearly")}
            className={cn("cash-flow-toggle-btn", chartMode === "yearly" && "cash-flow-toggle-btn-active")}
          >
            {t("dashboard.yearly")}
          </button>
        </div>
      </div>

      <ChartContainer className="cash-flow-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 12, left: 4, bottom: 0 }}
            barCategoryGap="26%"
          >
            <defs>
              <linearGradient id={activeGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9A5C" />
                <stop offset="35%" stopColor="#FF5F05" />
                <stop offset="100%" stopColor="#C94A00" />
              </linearGradient>
              <linearGradient id={inactiveGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2e2e32" />
                <stop offset="100%" stopColor="#1a1a1e" />
              </linearGradient>
              <filter id={shadowFilterId} x="-20%" y="-30%" width="140%" height="160%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#FF5F05" floodOpacity="0.4" />
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
              dy={10}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 500 }}
              tickFormatter={(v) => `${Number(v) / 1000}k`}
              domain={[0, yMax]}
              ticks={yTicks}
              width={42}
            />
            <Tooltip
              content={<CashFlowTooltip labels={tooltipLabels} />}
              cursor={{ fill: "rgba(255, 95, 5, 0.06)", radius: 12 }}
              animationDuration={200}
              offset={16}
              wrapperStyle={{ zIndex: 20, outline: "none" }}
            />
            <Bar
              dataKey="value"
              maxBarSize={56}
              minPointSize={MIN_BAR_PX}
              shape={renderBar}
              isAnimationActive
              animationBegin={80}
              animationDuration={900}
              animationEasing="ease-out"
              onClick={handleBarInteraction}
              onMouseEnter={handleBarInteraction}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </motion.div>
  );
}
