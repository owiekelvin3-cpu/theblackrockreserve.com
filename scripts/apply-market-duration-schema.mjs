import { PrismaClient } from "@prisma/client";
import {
  isDatabaseUnavailable,
  skipBuildMigrationIfNoDatabase,
  skipBuildMigrationOnVercel,
  warnAndSkip,
} from "./schema-migration-utils.mjs";

skipBuildMigrationOnVercel("Market duration plans schema apply");
skipBuildMigrationIfNoDatabase("Market duration plans schema apply");

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "MarketAsset" ADD COLUMN IF NOT EXISTS "durationPlans" JSONB`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "durationPlanId" TEXT`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "durationLabel" TEXT`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "expectedReturnPercent" DECIMAL(8,4)`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "projectedReturnUsd" DECIMAL(15,2)`,
];

async function main() {
  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("Market duration plans schema applied successfully.");
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      warnAndSkip("Market duration plans schema apply", error);
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
