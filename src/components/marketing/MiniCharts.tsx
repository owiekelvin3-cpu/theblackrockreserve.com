"use client";

const BRAND = "#ff5f05";
const MUTED = "#3a3a3a";

export function MiniLineChart({ className = "" }: { className?: string }) {
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
      <polyline
        points={coords}
        fill="none"
        stroke={BRAND}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MiniBarChart({ className = "" }: { className?: string }) {
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
          <rect
            key={i}
            x={x}
            y={h - barH}
            width={barW}
            height={barH}
            rx="2"
            fill={isPeak ? BRAND : MUTED}
          />
        );
      })}
    </svg>
  );
}

const REVENUE_VALUES = [42, 58, 72, 51, 64, 59, 68];
const REVENUE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function RevenueBarChart({ className = "" }: { className?: string }) {
  const w = 320;
  const h = 120;
  const max = Math.max(...REVENUE_VALUES);
  const peak = max;
  const barW = w / REVENUE_VALUES.length - 6;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-full ${className}`} preserveAspectRatio="none">
      {REVENUE_VALUES.map((v, i) => {
        const barH = (v / max) * (h - 24);
        const x = i * (barW + 6) + 3;
        const isPeak = v === peak;
        return (
          <g key={REVENUE_DAYS[i]}>
            <rect
              x={x}
              y={h - 18 - barH}
              width={barW}
              height={barH}
              rx="3"
              fill={isPeak ? BRAND : MUTED}
            />
            <text
              x={x + barW / 2}
              y={h - 4}
              textAnchor="middle"
              fill="#71717a"
              fontSize="9"
            >
              {REVENUE_DAYS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
