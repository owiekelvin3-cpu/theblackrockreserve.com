import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function mb(bytes) {
  return `${(Number(bytes) / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const [dbSize] = await prisma.$queryRaw`
    SELECT pg_database_size(current_database())::bigint AS bytes
  `;

  const tables = await prisma.$queryRaw`
    SELECT relname AS table_name, pg_total_relation_size(relid)::bigint AS bytes
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY bytes DESC
    LIMIT 15
  `;

  const [counts] = await prisma.$queryRaw`
    SELECT
      (SELECT count(*)::int FROM "User") AS users,
      (SELECT count(*)::int FROM "DepositRequest") AS deposits,
      (SELECT count(*)::int FROM "WithdrawalRequest") AS withdrawals,
      (SELECT count(*)::int FROM "Transaction") AS transactions,
      (SELECT count(*)::int FROM "UserNotification") AS notifications,
      (SELECT count(*)::int FROM "EmailLog") AS email_logs
  `;

  let profileBytes = 0;
  let depositProofBytes = 0;
  let chargeProofBytes = 0;

  try {
    const [p] = await prisma.$queryRaw`SELECT COALESCE(SUM(length("profileImage")), 0)::bigint AS b FROM "User" WHERE "profileImage" IS NOT NULL`;
    profileBytes = Number(p?.b ?? 0);
    const [d] = await prisma.$queryRaw`SELECT COALESCE(SUM(length("proofImage")), 0)::bigint AS b FROM "DepositRequest" WHERE "proofImage" IS NOT NULL`;
    depositProofBytes = Number(d?.b ?? 0);
    const [c] = await prisma.$queryRaw`SELECT COALESCE(SUM(length("proofImage")), 0)::bigint AS b FROM "WithdrawalChargePayment" WHERE "proofImage" IS NOT NULL`;
    chargeProofBytes = Number(c?.b ?? 0);
  } catch {
    /* optional columns */
  }

  console.log(
    JSON.stringify(
      {
        databaseSizeBytes: Number(dbSize.bytes),
        databaseSize: mb(dbSize.bytes),
        supabaseFreeTierDiskLimit: "500 MB (typical free project limit — verify in dashboard)",
        topTables: tables.map((t) => ({
          table: t.table_name,
          size: mb(t.bytes),
          bytes: Number(t.bytes),
        })),
        rowCounts: counts,
        imageBlobEstimate: {
          profileImages: mb(profileBytes),
          depositProofs: mb(depositProofBytes),
          chargeProofs: mb(chargeProofBytes),
          total: mb(profileBytes + depositProofBytes + chargeProofBytes),
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
