import type { Theme } from "@/lib/theme";

export const CHART_BRAND = "#FF5F05";
export const CHART_BRAND_LIGHT = "#FF8C42";

export const CHART_COLORS = [
  CHART_BRAND,
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

export function getChartTheme(theme: Theme = "dark") {
  const isLight = theme === "light";
  return {
    axis: isLight ? "#94a3b8" : "#475569",
    muted: isLight ? "#d1d5db" : "#3A3A3A",
    tooltip: {
      background: isLight ? "#ffffff" : "#1A1A1A",
      border: isLight ? "1px solid rgba(15,20,25,0.1)" : "1px solid rgba(255,255,255,0.08)",
      borderRadius: "12px",
      color: isLight ? "#0f1419" : "#FFFFFF",
    },
  };
}

/** @deprecated Use getChartTheme(theme).tooltip */
export const CHART_MUTED = "#3A3A3A";
/** @deprecated Use getChartTheme(theme).tooltip */
export const CHART_TOOLTIP_STYLE = {
  background: "#1A1A1A",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "12px",
  color: "#FFFFFF",
};

export const CHART_PURPLE = CHART_BRAND;
export const CHART_PURPLE_LIGHT = CHART_BRAND_LIGHT;
