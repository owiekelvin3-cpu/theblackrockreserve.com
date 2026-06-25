import { PrismaClient } from "@prisma/client";
import {
  isDatabaseUnavailable,
  skipBuildMigrationIfNoDatabase,
  skipBuildMigrationOnVercel,
  warnAndSkip,
} from "./schema-migration-utils.mjs";

skipBuildMigrationOnVercel("Email center schema apply");
skipBuildMigrationIfNoDatabase("Email center schema apply");

const prisma = new PrismaClient();

const statements = [
  `DO $$ BEGIN
    CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SCHEDULED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "EmailSendType" AS ENUM ('INDIVIDUAL', 'BROADCAST');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "EmailBroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "EmailRecipientFilter" AS ENUM ('ALL', 'ACTIVE', 'SELECTED', 'VERIFIED', 'WITH_INVESTMENTS', 'PENDING_KYC');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_slug_key" ON "EmailTemplate"("slug")`,
  `CREATE TABLE IF NOT EXISTS "EmailDraft" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled draft',
    "subject" TEXT NOT NULL DEFAULT '',
    "htmlBody" TEXT NOT NULL DEFAULT '',
    "recipientFilter" "EmailRecipientFilter",
    "recipientIds" JSONB,
    "scheduledAt" TIMESTAMP(3),
    "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDraft_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "EmailDraft_adminId_updatedAt_idx" ON "EmailDraft"("adminId", "updatedAt")`,
  `CREATE TABLE IF NOT EXISTS "EmailBroadcast" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "recipientFilter" "EmailRecipientFilter" NOT NULL,
    "recipientIds" JSONB,
    "status" "EmailBroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailBroadcast_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "EmailBroadcast_status_scheduledAt_idx" ON "EmailBroadcast"("status", "scheduledAt")`,
  `CREATE INDEX IF NOT EXISTS "EmailBroadcast_adminId_createdAt_idx" ON "EmailBroadcast"("adminId", "createdAt")`,
  `CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "subject" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "sendType" "EmailSendType" NOT NULL,
    "sentById" TEXT NOT NULL,
    "templateId" TEXT,
    "broadcastId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_status_createdAt_idx" ON "EmailLog"("status", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_sentById_createdAt_idx" ON "EmailLog"("sentById", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_recipientUserId_createdAt_idx" ON "EmailLog"("recipientUserId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_broadcastId_idx" ON "EmailLog"("broadcastId")`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_scheduledAt_idx" ON "EmailLog"("scheduledAt")`,
  `CREATE INDEX IF NOT EXISTS "EmailLog_to_idx" ON "EmailLog"("to")`,
];

async function main() {
  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("Email center schema applied successfully.");
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      warnAndSkip("Email center schema apply", error);
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
