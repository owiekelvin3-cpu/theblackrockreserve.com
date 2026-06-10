"use client";

import { useCallback, useMemo, useState } from "react";
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
import EmptyState from "@/components/dashboard/EmptyState";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn, formatCurrency } from "@/lib/utils";

export type CashFlowMonth = {
  month: string;
  value: number;
  inflow: number;
  tooltipDate: string;
};

const DISPLAY_MONTHS = 7;
const INACTIVE_BAR = "#252528";
const INACTIVE_BAR_BOTTOM = "#1a1a1c";

type ChartMode = "monthly" | "yearly";

type CashFlowBarProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CashFlowMonth;
  activeMonth: string;
};

function CashFlowBarShape({ x = 0, y = 0, width = 0, height = 0, payload, activeMonth }: CashFlowBarProps) {
  if (width <= 0 || height <= 0) return null;
  const isActive = payload?.month === activeMonth;
  const r = 10;

  return (
    <g>
      <path
        d={`M ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + width - r} ${y} Q ${x + width} ${y} ${x + width} ${y + r} L ${x + width} ${y + height} L ${x} ${y + height} Z`}
        fill={isActive ? "url(#cf-bar-active)" : "url(#cf-bar-inactive)"}
        style={{ cursor: "pointer" }}
      />
      {isActive && (
        <>
          <circle
            cx={x + width / 2}
            cy={y}
            r={6}
            fill="rgba(255, 95, 5, 0.35)"
          />
          <circle
            cx={x + width / 2}
            cy={y}
            r={3.5}
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
}: {
  active?: boolean;
  payload?: { payload: CashFlowMonth }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as CashFlowMonth;

  return (
    <div className="cash-flow-tooltip">
      <p className="cash-flow-tooltip-date">{row.tooltipDate}</p>
      <div className="cash-flow-tooltip-row">
        <span>Cashflow</span>
        <span className="cash-flow-tooltip-value">{formatCurrency(row.value)}</span>
      </div>
      <div className="cash-flow-tooltip-row">
        <span>Inflow</span>
        <span className="cash-flow-tooltip-value">{formatCurrency(row.inflow)}</span>
      </div>
      <div className="cash-flow-tooltip-tail" />
    </div>
  );
}

export default function CashFlowPanel({
  data,
}: {
  data: CashFlowMonth[];
}) {
  const { t } = useI18n();
  const [chartMode, setChartMode] = useState<ChartMode>("yearly");
  const [activeMonth, setActiveMonth] = useState(() => {
    const peak = [...data].sort((a, b) => b.value - a.value)[0];
    return peak?.month ?? data[0]?.month ?? "Jan";
  });

  /** Reference layout: Jan–Jul bars (7 months) */
  const chartData = useMemo(() => data.slice(0, DISPLAY_MONTHS), [data]);

  const cashFlowTotal = useMemo(
    () =>
      chartMode === "yearly"
        ? data.reduce((s, m) => s + m.value, 0)
        : chartData.reduce((s, m) => s + m.value, 0),
    [data, chartData, chartMode]
  );

  const yMax = useMemo(() => {
    const peak = Math.max(...chartData.map((m) => m.value), 1);
    const step = 10000;
    return Math.ceil(peak / step) * step || 50000;
  }, [chartData]);

  const isEmpty = chartData.every((m) => m.value === 0);

  const renderBar = useCallback(
    (props: CashFlowBarProps) => <CashFlowBarShape {...props} activeMonth={activeMonth} />,
    [activeMonth]
  );

  return (
    <div className="cash-flow-card">
      <div className="cash-flow-header">
        <div>
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

      {isEmpty ? (
        <EmptyState title={t("dashboard.noCashFlow")} description={t("dashboard.noCashFlowDesc")} />
      ) : (
        <ChartContainer className="cash-flow-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
              barCategoryGap="28%"
            >
              <defs>
                <linearGradient id="cf-bar-active" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF6B2E" />
                  <stop offset="55%" stopColor="#FF5F05" />
                  <stop offset="100%" stopColor="#D94A00" />
                </linearGradient>
                <linearGradient id="cf-bar-inactive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={INACTIVE_BAR} />
                  <stop offset="100%" stopColor={INACTIVE_BAR_BOTTOM} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="0"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickFormatter={(v) => `${Number(v) / 1000}k`}
                domain={[0, yMax]}
                ticks={[0, yMax * 0.2, yMax * 0.4, yMax * 0.6, yMax * 0.8, yMax].map(Math.round)}
                width={36}
              />
              <Tooltip
                content={<CashFlowTooltip />}
                cursor={{ fill: "rgba(255, 95, 5, 0.04)" }}
              />
              <Bar
                dataKey="value"
                maxBarSize={52}
                shape={renderBar as never}
                onClick={(entry) => {
                  const row = entry as unknown as CashFlowMonth;
                  if (row?.month) setActiveMonth(row.month);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </div>
  );
}
