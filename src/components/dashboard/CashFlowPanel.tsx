"use client";

import { useCallback, useMemo, useState } from "react";
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
const INACTIVE_TOP = "#2a2a2e";
const INACTIVE_BOTTOM = "#1c1c1f";
const MIN_BAR_PX = 8;

type ChartMode = "monthly" | "yearly";

type CashFlowBarProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  month?: string;
  payload?: CashFlowMonth;
  activeMonth: string;
};

function CashFlowBarShape({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  month,
  payload,
  activeMonth,
}: CashFlowBarProps) {
  if (width <= 0) return null;

  const barMonth = month ?? payload?.month;
  const isActive = barMonth === activeMonth;
  const barHeight = Math.max(height, MIN_BAR_PX);
  const barY = height < MIN_BAR_PX ? y + height - MIN_BAR_PX : y;
  const r = Math.min(14, barHeight / 2, width / 2);

  return (
    <g className={cn("cash-flow-bar", isActive && "cash-flow-bar-active")}>
      <path
        d={`M ${x} ${barY + r} Q ${x} ${barY} ${x + r} ${barY} L ${x + width - r} ${barY} Q ${x + width} ${barY} ${x + width} ${barY + r} L ${x + width} ${barY + barHeight} L ${x} ${barY + barHeight} Z`}
        fill={isActive ? "url(#cf-bar-active)" : "url(#cf-bar-inactive)"}
        style={{ cursor: "pointer" }}
      />
      {isActive && (
        <>
          <circle
            cx={x + width / 2}
            cy={barY}
            r={7}
            fill="rgba(255, 95, 5, 0.45)"
            className="cash-flow-bar-glow"
          />
          <circle
            cx={x + width / 2}
            cy={barY}
            r={4}
            fill="#ffffff"
            stroke="#FF5F05"
            strokeWidth={1.5}
          />
        </>
      )}
    </g>
  );
}

function CashFlowTooltip({
  active,
  payload,
  labels,
}: {
  active?: boolean;
  payload?: { payload: CashFlowMonth }[];
  labels: {
    cashFlow: string;
    inflow: string;
    outflow: string;
    format: (value: number) => string;
  };
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as CashFlowMonth;
  const net = row.inflow - row.outflow;

  return (
    <motion.div
      className="cash-flow-tooltip"
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
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
      <div className="cash-flow-tooltip-tail" />
    </motion.div>
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

  const chartData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const start = Math.max(0, currentMonth - (DISPLAY_MONTHS - 1));
    return data.slice(start, currentMonth + 1);
  }, [data]);

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
    if (peak === 0) return buildYAxis(50000);
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
    (props: CashFlowBarProps) => <CashFlowBarShape {...props} activeMonth={activeMonth} />,
    [activeMonth]
  );

  const handleBarInteraction = useCallback((entry: unknown) => {
    const raw = entry as CashFlowMonth & { payload?: CashFlowMonth };
    const row = raw?.month ? raw : raw?.payload;
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
            margin={{ top: 24, right: 8, left: 0, bottom: 4 }}
            barCategoryGap="28%"
          >
            <defs>
              <linearGradient id="cf-bar-active" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF8A4C" />
                <stop offset="40%" stopColor="#FF5F05" />
                <stop offset="100%" stopColor="#C94A00" />
              </linearGradient>
              <linearGradient id="cf-bar-inactive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INACTIVE_TOP} />
                <stop offset="100%" stopColor={INACTIVE_BOTTOM} />
              </linearGradient>
              <filter id="cf-bar-shadow" x="-20%" y="-30%" width="140%" height="160%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#FF5F05" floodOpacity="0.35" />
              </filter>
            </defs>
            <CartesianGrid
              strokeDasharray="0"
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 12, fontWeight: 500 }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 500 }}
              tickFormatter={(v) => `${Number(v) / 1000}k`}
              domain={[0, yMax]}
              ticks={yTicks}
              width={44}
            />
            <Tooltip
              content={<CashFlowTooltip labels={tooltipLabels} />}
              cursor={{ fill: "rgba(255, 95, 5, 0.05)", radius: 10 }}
              animationDuration={220}
            />
            <Bar
              dataKey="value"
              maxBarSize={52}
              minPointSize={MIN_BAR_PX}
              shape={renderBar as never}
              isAnimationActive
              animationBegin={100}
              animationDuration={1000}
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
