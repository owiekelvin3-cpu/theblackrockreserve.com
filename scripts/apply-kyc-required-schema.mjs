import { PrismaClient } from "@prisma/client";
import {
  isDatabaseUnavailable,
  skipBuildMigrationIfNoDatabase,
  skipBuildMigrationOnVercel,
  warnAndSkip,
} from "./schema-migration-utils.mjs";

skipBuildMigrationOnVercel("KYC required schema apply");
skipBuildMigrationIfNoDatabase("KYC required schema apply");

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycRequired" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycIdType" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycIdNumber" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycAddress" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycSubmittedAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "kycReviewedAt" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "User_kycRequired_kycStatus_idx" ON "User" ("kycRequired", "kycStatus")`,
];

async function main() {
  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("KYC required schema applied successfully.");
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      warnAndSkip("KYC required schema apply", error);
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
