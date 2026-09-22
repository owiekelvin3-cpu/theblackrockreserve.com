export type MarketDurationPlan = {
  id: string;
  days: number;
  label: string;
  returnPercent: number;
  enabled: boolean;
};

export type DurationPlanSource = {
  expectedReturnPercent: number;
  return7d: number;
  return14d: number;
  return30d: number;
  return90d: number;
  return1y: number;
  returnWeekly: number;
  returnMonthly: number;
  returnYearly: number;
  customReturnLabel?: string | null;
  customReturnPercent?: number | null;
  durationPlans?: unknown;
};

export const STANDARD_DURATION_PRESETS = [
  { id: "7d", days: 7, label: "7 Days" },
  { id: "14d", days: 14, label: "14 Days" },
  { id: "30d", days: 30, label: "30 Days" },
  { id: "90d", days: 90, label: "90 Days" },
  { id: "1y", days: 365, label: "1 Year" },
] as const;

export type ReturnPeriodKey =
  | "7d"
  | "14d"
  | "30d"
  | "90d"
  | "1y"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom"
  | "expected";

const PERIOD_TO_PLAN_ID: Record<ReturnPeriodKey, string> = {
  "7d": "7d",
  "14d": "14d",
  "30d": "30d",
  "90d": "90d",
  "1y": "1y",
  weekly: "7d",
  monthly: "30d",
  yearly: "1y",
  custom: "custom",
  expected: "1y",
};

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundPercent(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Total return for a holding period: daily % × days. */
export function scaleDailyReturn(dailyPercent: number, days: number): number {
  if (!Number.isFinite(dailyPercent) || !Number.isFinite(days) || days <= 0) return 0;
  return roundPercent(dailyPercent * days);
}

/** @deprecated use scaleDailyReturn — expected return is a daily rate. */
export function scaleAnnualReturn(dailyPercent: number, days: number): number {
  return scaleDailyReturn(dailyPercent, days);
}

export function applyDailyReturnToPlans(plans: MarketDurationPlan[], dailyPercent: number): MarketDurationPlan[] {
  return plans.map((plan) => ({
    ...plan,
    returnPercent: scaleDailyReturn(dailyPercent, plan.days),
  }));
}

export function newDurationPlanId(): string {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function asFiniteNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseCustomDaysFromLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const match = label.match(/(\d+)\s*(d|day|days|wk|week|weeks|mo|month|months|y|yr|year|years)?/i);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (match[2] ?? "d").toLowerCase();
  if (unit.startsWith("w")) return Math.round(n * 7);
  if (unit.startsWith("mo") || unit === "m") return Math.round(n * 30);
  if (unit.startsWith("y")) return Math.round(n * 365);
  return Math.round(n);
}

export function parseDurationPlans(raw: unknown): MarketDurationPlan[] {
  if (!Array.isArray(raw)) return [];

  const plans: MarketDurationPlan[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const days = asFiniteNumber(row.days);
    const returnPercent = asFiniteNumber(row.returnPercent);
    if (days == null || days < 1 || days > 3650) continue;
    if (returnPercent == null || returnPercent < -100 || returnPercent > 50_000) continue;

    const rawId = typeof row.id === "string" && row.id.trim() ? row.id.trim() : `d-${Math.round(days)}`;
    let id = rawId.slice(0, 40);
    if (seen.has(id)) id = `${id}-${plans.length}`;
    seen.add(id);

    const label =
      typeof row.label === "string" && row.label.trim()
        ? row.label.trim().slice(0, 40)
        : `${Math.round(days)} Days`;

    plans.push({
      id,
      days: Math.round(days),
      label,
      returnPercent: roundPercent(returnPercent),
      enabled: row.enabled !== false,
    });
  }

  return plans.slice(0, 12);
}

function storedOrScaled(stored: number, dailyPercent: number, days: number): number {
  if (Number.isFinite(stored) && stored !== 0) return roundPercent(stored);
  return scaleDailyReturn(dailyPercent, days);
}

export function defaultDurationPlans(source: DurationPlanSource): MarketDurationPlan[] {
  const daily = Number.isFinite(source.expectedReturnPercent) ? source.expectedReturnPercent : 1;
  const plans: MarketDurationPlan[] = STANDARD_DURATION_PRESETS.map((preset) => {
    let stored = 0;
    if (preset.days === 7) stored = source.return7d || source.returnWeekly;
    else if (preset.days === 14) stored = source.return14d;
    else if (preset.days === 30) stored = source.return30d || source.returnMonthly;
    else if (preset.days === 90) stored = source.return90d;
    else if (preset.days === 365) stored = source.return1y || source.returnYearly;

    return {
      ...preset,
      returnPercent: storedOrScaled(stored, daily, preset.days),
      enabled: true,
    };
  });

  if (source.customReturnPercent != null && Number.isFinite(source.customReturnPercent)) {
    const days = parseCustomDaysFromLabel(source.customReturnLabel) ?? 60;
    plans.push({
      id: "custom",
      days,
      label: source.customReturnLabel?.trim() || `${days} Days`,
      returnPercent: roundPercent(source.customReturnPercent),
      enabled: true,
    });
  }

  return plans;
}

export function getDurationPlans(source: DurationPlanSource): MarketDurationPlan[] {
  const parsed = parseDurationPlans(source.durationPlans);
  if (parsed.length > 0) return parsed;
  return defaultDurationPlans(source);
}

export function getEnabledDurationPlans(source: DurationPlanSource): MarketDurationPlan[] {
  const enabled = getDurationPlans(source).filter((plan) => plan.enabled);
  return enabled.length > 0 ? enabled : defaultDurationPlans(source);
}

export function findDurationPlan(
  source: DurationPlanSource,
  planId?: string | null
): MarketDurationPlan | null {
  const plans = getEnabledDurationPlans(source);
  if (planId) {
    const match = plans.find((plan) => plan.id === planId);
    if (match) return match;
  }
  return plans.find((plan) => plan.id === "30d") ?? plans[0] ?? null;
}

export function planIdForReturnPeriod(period: ReturnPeriodKey): string {
  return PERIOD_TO_PLAN_ID[period] ?? "30d";
}

export function utcDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number): Date {
  const next = utcDateOnly(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function utcDaysInclusive(from: Date, to: Date): number {
  const start = utcDateOnly(from).getTime();
  const end = utcDateOnly(to).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000)) + 1;
}

export function splitDailyProfit(projected: number, days: number) {
  const termDays = Math.max(1, Math.round(days));
  const total = roundMoney(Math.max(0, projected));
  const daily = roundMoney(total / termDays);
  return { daily, total, days: termDays };
}

export function payoutAmountForDay(projected: number, days: number, dayIndex: number, alreadyAccrued: number) {
  const { daily, total, days: termDays } = splitDailyProfit(projected, days);
  const remaining = roundMoney(Math.max(0, total - alreadyAccrued));
  if (dayIndex >= termDays) return remaining;
  return roundMoney(Math.min(daily, remaining));
}

export function calculateHoldReturn(amount: number, returnPercent: number, days = 1) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const profit = roundMoney(safeAmount * (returnPercent / 100));
  const termDays = Math.max(1, Math.round(days));
  const { daily } = splitDailyProfit(profit, termDays);
  return {
    profit,
    payout: roundMoney(safeAmount + profit),
    returnPercent: roundPercent(returnPercent),
    daily,
    days: termDays,
  };
}

export function maturityDateFromDays(days: number, from = new Date()): Date {
  const termDays = Math.max(1, Math.round(days));
  return addUtcDays(from, termDays - 1);
}

export function examplePurchaseAmount(minInvestment: number): number {
  if (!Number.isFinite(minInvestment) || minInvestment <= 0) return 1000;
  return minInvestment <= 1000 ? 1000 : roundMoney(minInvestment);
}

export function syncReturnFieldsFromPlans(plans: MarketDurationPlan[]) {
  const enabled = plans.filter((plan) => plan.enabled);
  const pick = (days: number) => {
    const value = enabled.find((plan) => plan.days === days)?.returnPercent;
    if (value == null) return 0;
    return Math.max(-9999.99, Math.min(9999.99, roundPercent(value)));
  };
  const custom = enabled.find((plan) => plan.id === "custom" || !STANDARD_DURATION_PRESETS.some((p) => p.id === plan.id));
  const customPercent =
    custom && custom.id === "custom"
      ? Math.max(-9999.99, Math.min(9999.99, roundPercent(custom.returnPercent)))
      : null;

  return {
    return7d: pick(7),
    return14d: pick(14),
    return30d: pick(30),
    return90d: pick(90),
    return1y: pick(365),
    returnWeekly: pick(7),
    returnMonthly: pick(30),
    returnYearly: pick(365),
    customReturnLabel: custom?.label ?? null,
    customReturnPercent: customPercent,
  };
}
