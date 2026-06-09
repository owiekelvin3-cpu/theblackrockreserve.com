import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rows = await prisma.platformSetting.findMany();
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
