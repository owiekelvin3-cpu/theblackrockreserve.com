import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const admin = await prisma.user.findUnique({
  where: { email: "admin@blackrockreserve.com" },
  select: { id: true, email: true, role: true, status: true, emailVerified: true, password: true },
});

console.log("Admin:", { ...admin, password: admin?.password ? "[hash present]" : null });

if (admin?.password) {
  const ok = await bcrypt.compare("Admin123!", admin.password);
  console.log("Password Admin123! matches:", ok);
}

await prisma.$disconnect();
