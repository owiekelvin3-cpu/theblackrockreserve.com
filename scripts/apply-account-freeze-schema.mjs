import { PrismaClient } from "@prisma/client";
import {
  isDatabaseUnavailable,
  skipBuildMigrationIfNoDatabase,
  skipBuildMigrationOnVercel,
  warnAndSkip,
} from "./schema-migration-utils.mjs";

skipBuildMigrationOnVercel("Account freeze schema apply");
skipBuildMigrationIfNoDatabase("Account freeze schema apply");

const prisma = new PrismaClient();

const statements = [
  `DO $$ BEGIN
    CREATE TYPE "AccountFreezeType" AS ENUM ('FULL', 'WITHDRAWAL_ONLY');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE "AccountFreezeStatus" AS ENUM ('ACTIVE', 'RELEASED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE "FundReleaseRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "AccountFreeze" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "freezeType" "AccountFreezeType" NOT NULL,
    "reason" TEXT NOT NULL,
    "internalNotes" TEXT,
    "status" "AccountFreezeStatus" NOT NULL DEFAULT 'ACTIVE',
    "frozenById" TEXT NOT NULL,
    "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unfrozenById" TEXT,
    "unfrozenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountFreeze_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AccountFreeze_userId_status_idx" ON "AccountFreeze"("userId", "status")`,
  `CREATE INDEX IF NOT EXISTS "AccountFreeze_status_frozenAt_idx" ON "AccountFreeze"("status", "frozenAt")`,
  `CREATE TABLE IF NOT EXISTS "FundReleaseRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountFreezeId" TEXT NOT NULL,
    "status" "FundReleaseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "userMessage" TEXT,
    "adminNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FundReleaseRequest_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "FundReleaseRequest_status_createdAt_idx" ON "FundReleaseRequest"("status", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "FundReleaseRequest_userId_status_idx" ON "FundReleaseRequest"("userId", "status")`,
  `CREATE TABLE IF NOT EXISTS "AccountFreezeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountFreezeLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "AccountFreezeLog_userId_createdAt_idx" ON "AccountFreezeLog"("userId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AccountFreezeLog_action_createdAt_idx" ON "AccountFreezeLog"("action", "createdAt")`,
  `DO $$ BEGIN
    ALTER TABLE "AccountFreeze" ADD CONSTRAINT "AccountFreeze_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "AccountFreeze" ADD CONSTRAINT "AccountFreeze_frozenById_fkey"
      FOREIGN KEY ("frozenById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "AccountFreeze" ADD CONSTRAINT "AccountFreeze_unfrozenById_fkey"
      FOREIGN KEY ("unfrozenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "FundReleaseRequest" ADD CONSTRAINT "FundReleaseRequest_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "FundReleaseRequest" ADD CONSTRAINT "FundReleaseRequest_accountFreezeId_fkey"
      FOREIGN KEY ("accountFreezeId") REFERENCES "AccountFreeze"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "FundReleaseRequest" ADD CONSTRAINT "FundReleaseRequest_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "AccountFreezeLog" ADD CONSTRAINT "AccountFreezeLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "AccountFreezeLog" ADD CONSTRAINT "AccountFreezeLog_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

async function main() {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Account freeze tables ready");
}

main()
  .catch((e) => {
    if (isDatabaseUnavailable(e)) {
      warnAndSkip("Account freeze schema apply (database unavailable)", e);
      return;
    }
    console.warn("Account freeze schema apply skipped or partial:", e.message ?? e);
  })
  .finally(() => prisma.$disconnect());
