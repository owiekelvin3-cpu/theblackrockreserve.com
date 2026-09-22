import { z } from "zod";
import type { MarketAsset, Prisma } from "@prisma/client";
import { parseDurationPlans, syncReturnFieldsFromPlans } from "@/lib/market-duration";

function emptyToUndefined(v: unknown): unknown {
  if (v === "" || v === null || v === undefined) return undefined;
  return v;
}

function optionalNumber(opts?: { min?: number; max?: number; int?: boolean }) {
  const min = opts?.min ?? -999_999;
  const max = opts?.max ?? 999_999_999;
  let schema = z.coerce
    .number()
    .refine((n) => !Number.isNaN(n), "Must be a valid number")
    .min(min)
    .max(max);
  if (opts?.int) schema = schema.int();
  return z.preprocess(emptyToUndefined, schema.optional());
}

function optionalNullableNumber(opts?: { min?: number; max?: number }) {
  const min = opts?.min ?? -9999;
  const max = opts?.max ?? 9999;
  return z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : v),
    z.union([z.null(), z.coerce.number().refine((n) => !Number.isNaN(n), "Must be a valid number").min(min).max(max)]).optional()
  );
}

const optionalString = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().max(max).optional());

export const marketAssetFieldsSchema = z.object({
  name: optionalString(120),
  sector: optionalString(60),
  description: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  logoDomain: z.union([z.string().max(120), z.null()]).optional(),
  logoUrl: z.union([z.string().max(500_000), z.null()]).optional(),
  price: optionalNumber({ min: 0.01, max: 999_999_999 }),
  changePercent: optionalNumber({ min: -9999, max: 9999 }),
  minInvestment: optionalNumber({ min: 0, max: 999_999_999 }),
  riskRating: z.enum(["Low", "Medium", "High"]).optional(),
  expectedReturnPercent: optionalNumber({ min: -100, max: 1000 }),
  growthRate: optionalNumber({ min: -9999, max: 9999 }),
  return7d: optionalNumber({ min: -100, max: 50_000 }),
  return14d: optionalNumber({ min: -100, max: 50_000 }),
  return30d: optionalNumber({ min: -100, max: 50_000 }),
  return90d: optionalNumber({ min: -100, max: 50_000 }),
  return1y: optionalNumber({ min: -100, max: 50_000 }),
  returnWeekly: optionalNumber({ min: -100, max: 50_000 }),
  returnMonthly: optionalNumber({ min: -100, max: 50_000 }),
  returnYearly: optionalNumber({ min: -100, max: 50_000 }),
  customReturnLabel: z.union([z.string().max(40), z.null()]).optional(),
  customReturnPercent: optionalNullableNumber({ min: -100, max: 50_000 }),
  durationPlans: z.array(z.unknown()).max(12).optional(),
  marketCapRank: optionalNumber({ min: 0, max: 9999, int: true }),
  popularity: optionalNumber({ min: 0, max: 999_999, int: true }),
  sortOrder: optionalNumber({ min: 0, max: 99_999, int: true }),
  isFeatured: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const createMarketAssetSchema = z.object({
  symbol: z.string().min(1).max(12).transform((s) => s.trim().toUpperCase()),
  name: optionalString(120),
  sector: optionalString(60),
  description: z.preprocess(emptyToUndefined, z.string().max(4000).optional()),
  logoDomain: z.union([z.string().max(120), z.null()]).optional(),
  logoUrl: z.union([z.string().max(500_000), z.null()]).optional(),
  price: optionalNumber({ min: 0.01, max: 999_999_999 }),
  changePercent: optionalNumber({ min: -9999, max: 9999 }),
  minInvestment: optionalNumber({ min: 0, max: 999_999_999 }),
  riskRating: z.enum(["Low", "Medium", "High"]).optional(),
  expectedReturnPercent: optionalNumber({ min: -100, max: 1000 }),
  growthRate: optionalNumber({ min: -9999, max: 9999 }),
  return7d: optionalNumber({ min: -100, max: 50_000 }),
  return14d: optionalNumber({ min: -100, max: 50_000 }),
  return30d: optionalNumber({ min: -100, max: 50_000 }),
  return90d: optionalNumber({ min: -100, max: 50_000 }),
  return1y: optionalNumber({ min: -100, max: 50_000 }),
  returnWeekly: optionalNumber({ min: -100, max: 50_000 }),
  returnMonthly: optionalNumber({ min: -100, max: 50_000 }),
  returnYearly: optionalNumber({ min: -100, max: 50_000 }),
  customReturnLabel: z.union([z.string().max(40), z.null()]).optional(),
  customReturnPercent: optionalNullableNumber({ min: -100, max: 50_000 }),
  durationPlans: z.array(z.unknown()).max(12).optional(),
  marketCapRank: optionalNumber({ min: 0, max: 9999, int: true }),
  popularity: optionalNumber({ min: 0, max: 999_999, int: true }),
  sortOrder: optionalNumber({ min: 0, max: 99_999, int: true }),
  isFeatured: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export const reorderMarketAssetsSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export type MarketAssetFieldsInput = z.infer<typeof marketAssetFieldsSchema>;
export type MarketAssetFormInput = z.infer<typeof createMarketAssetSchema>;

function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

function durationPlanFields(rawPlans: unknown[] | undefined) {
  if (!rawPlans) return {};
  const plans = parseDurationPlans(rawPlans);
  if (plans.length === 0) return {};
  return {
    durationPlans: plans as unknown as Prisma.InputJsonValue,
    ...syncReturnFieldsFromPlans(plans),
  };
}

export function buildMarketAssetCreateData(
  input: MarketAssetFormInput,
  sortOrder: number
): Prisma.MarketAssetCreateInput {
  const symbol = input.symbol;
  const name = input.name?.trim() || symbol;
  const durationFields = durationPlanFields(input.durationPlans);
  return {
    symbol,
    name,
    sector: input.sector?.trim() || "Technology",
    description: input.description?.trim() || `${name} equity security.`,
    logoDomain: input.logoDomain ?? null,
    logoUrl: input.logoUrl ?? null,
    price: input.price ?? 1,
    changePercent: input.changePercent ?? 0,
    minInvestment: input.minInvestment ?? 100,
    riskRating: input.riskRating ?? "Medium",
    expectedReturnPercent: input.expectedReturnPercent ?? 8,
    growthRate: input.growthRate ?? 0,
    return7d: input.return7d ?? 0,
    return14d: input.return14d ?? 0,
    return30d: input.return30d ?? 0,
    return90d: input.return90d ?? 0,
    return1y: input.return1y ?? 0,
    returnWeekly: input.returnWeekly ?? 0,
    returnMonthly: input.returnMonthly ?? 0,
    returnYearly: input.returnYearly ?? 0,
    customReturnLabel: input.customReturnLabel ?? null,
    customReturnPercent: input.customReturnPercent ?? null,
    marketCapRank: input.marketCapRank ?? 999,
    popularity: input.popularity ?? 0,
    sortOrder,
    isFeatured: input.isFeatured ?? false,
    isPinned: input.isPinned ?? false,
    enabled: input.enabled ?? true,
    ...durationFields,
  };
}

export function buildMarketAssetUpdateData(
  input: MarketAssetFieldsInput,
  existing: MarketAsset
): Prisma.MarketAssetUpdateInput {
  const name = input.name?.trim() || existing.name;
  const raw = pickDefined({
    name: input.name !== undefined ? name : undefined,
    sector: input.sector?.trim() || (input.sector !== undefined ? "Technology" : undefined),
    description:
      input.description !== undefined
        ? input.description.trim() || `${name} equity security.`
        : undefined,
    logoDomain: input.logoDomain,
    logoUrl: input.logoUrl,
    price: input.price,
    changePercent: input.changePercent,
    minInvestment: input.minInvestment,
    riskRating: input.riskRating,
    expectedReturnPercent: input.expectedReturnPercent,
    growthRate: input.growthRate,
    return7d: input.return7d,
    return14d: input.return14d,
    return30d: input.return30d,
    return90d: input.return90d,
    return1y: input.return1y,
    returnWeekly: input.returnWeekly,
    returnMonthly: input.returnMonthly,
    returnYearly: input.returnYearly,
    customReturnLabel: input.customReturnLabel,
    customReturnPercent: input.customReturnPercent,
    ...durationPlanFields(input.durationPlans),
    marketCapRank: input.marketCapRank,
    popularity: input.popularity,
    sortOrder: input.sortOrder,
    isFeatured: input.isFeatured,
    isPinned: input.isPinned,
    enabled: input.enabled,
  });
  return raw;
}

export function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}
