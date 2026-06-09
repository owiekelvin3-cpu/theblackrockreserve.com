/**
 * Create the first admin user.
 * Usage: node scripts/create-admin.mjs
 * Env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME (optional)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL || "admin@blackrockreserve.com";
const password = process.env.ADMIN_PASSWORD || "Admin123!";
const name = process.env.ADMIN_NAME || "Platform Admin";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", emailVerified: new Date() },
    });
    console.log(`Updated existing user to ADMIN: ${email}`);
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: "ADMIN",
        emailVerified: new Date(),
        kycStatus: "VERIFIED",
      },
    });
    console.log(`Created admin user: ${email}`);
  }

  console.log(`\nLogin at /admin/login`);
  console.log(`Email: ${email}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`Password: ${password} (change in production!)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
