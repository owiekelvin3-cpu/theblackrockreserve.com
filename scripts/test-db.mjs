import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const count = await prisma.user.count();
  console.log("Prisma connected OK. User count:", count);
} catch (err) {
  console.error("Connection failed:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
