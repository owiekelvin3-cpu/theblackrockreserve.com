import pg from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DIRECT_URL or DATABASE_URL");
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

const statements = [
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "withdrawalScriptStep" INTEGER NOT NULL DEFAULT 0`,
  `DO $$ BEGIN
    CREATE TYPE "WithdrawalScriptPhase" AS ENUM (
      'NONE', 'PENDING_TIMER', 'BANK_REJECTED', 'AWAITING_IMF_CLEARANCE',
      'IMF_PENDING_VERIFICATION', 'SCRIPT_COMPLETE'
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE "ImfClearancePaymentStatus" AS ENUM (
      'UNPAID', 'PENDING_VERIFICATION', 'PAID', 'REJECTED'
    );
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "scriptPhase" "WithdrawalScriptPhase" NOT NULL DEFAULT 'NONE'`,
  `ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "scriptPendingStartedAt" TIMESTAMP(3)`,
  `CREATE TABLE IF NOT EXISTS "ImfClearancePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "withdrawalRequestId" TEXT NOT NULL,
    "amountUsd" DECIMAL(15,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'BITCOIN',
    "status" "ImfClearancePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "txHash" TEXT,
    "proofNote" TEXT,
    "proofImage" TEXT,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImfClearancePayment_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ImfClearancePayment_withdrawalRequestId_key" ON "ImfClearancePayment"("withdrawalRequestId")`,
  `DO $$ BEGIN
    ALTER TABLE "ImfClearancePayment" ADD CONSTRAINT "ImfClearancePayment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "ImfClearancePayment" ADD CONSTRAINT "ImfClearancePayment_withdrawalRequestId_fkey"
      FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    ALTER TABLE "ImfClearancePayment" ADD CONSTRAINT "ImfClearancePayment_reviewedBy_fkey"
      FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

async function main() {
  await client.connect();
  for (const sql of statements) {
    await client.query(sql);
    console.log("OK:", sql.slice(0, 60).replace(/\s+/g, " "));
  }
  await client.end();
  console.log("Withdrawal script schema applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
