import { PrismaClient } from "@prisma/client";
import {
  isDatabaseUnavailable,
  skipBuildMigrationIfNoDatabase,
  skipBuildMigrationOnVercel,
  warnAndSkip,
} from "./schema-migration-utils.mjs";

skipBuildMigrationOnVercel("Preferred currency schema apply");
skipBuildMigrationIfNoDatabase("Preferred currency schema apply");

const prisma = new PrismaClient();

const statements = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "preferredCurrency" TEXT NOT NULL DEFAULT 'USD'`,
  `UPDATE "User" SET "preferredCurrency" = 'USD' WHERE "preferredCurrency" IS NULL OR "preferredCurrency" = ''`,
];

async function main() {
  try {
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log("Preferred currency schema applied successfully.");
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      warnAndSkip("Preferred currency schema apply", error);
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
