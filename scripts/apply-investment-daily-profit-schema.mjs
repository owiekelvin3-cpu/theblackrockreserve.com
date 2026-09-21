import { PrismaClient } from "@prisma/client";
import {
  isDatabaseUnavailable,
  skipBuildMigrationIfNoDatabase,
  skipBuildMigrationOnVercel,
  warnAndSkip,
} from "./schema-migration-utils.mjs";

skipBuildMigrationOnVercel("Investment daily profit schema apply");
skipBuildMigrationIfNoDatabase("Investment daily profit schema apply");

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "maturityAt" TIMESTAMP(3)`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "dailyProfitUsd" DECIMAL(15,2)`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "accruedProfitUsd" DECIMAL(15,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE "InvestmentOrder" ADD COLUMN IF NOT EXISTS "accrualClosedAt" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "InvestmentOrder_side_accrualClosedAt_idx" ON "InvestmentOrder"("side", "accrualClosedAt")`,
  `CREATE TABLE IF NOT EXISTS "InvestmentDailyCredit" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "symbol" TEXT NOT NULL,
      "dayDate" DATE NOT NULL,
      "amount" DECIMAL(15,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InvestmentDailyCredit_pkey" PRIMARY KEY ("id")
    )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "InvestmentDailyCredit_orderId_dayDate_key" ON "InvestmentDailyCredit"("orderId", "dayDate")`,
  `CREATE INDEX IF NOT EXISTS "InvestmentDailyCredit_userId_createdAt_idx" ON "InvestmentDailyCredit"("userId", "createdAt")`,
];

const constraints = [
  `DO $$ BEGIN
    ALTER TABLE "InvestmentDailyCredit"
      ADD CONSTRAINT "InvestmentDailyCredit_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "InvestmentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "InvestmentDailyCredit"
      ADD CONSTRAINT "InvestmentDailyCredit_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

async function main() {
  try {
    for (const sql of [...statements, ...constraints]) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("Investment daily profit schema applied successfully.");
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      warnAndSkip("Investment daily profit schema apply", error);
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
