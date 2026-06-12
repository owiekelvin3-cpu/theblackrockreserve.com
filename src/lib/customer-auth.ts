import { Prisma } from "@prisma/client";

/** Prisma filter — any registered customer (admin user management) */
export const registeredCustomerWhere: Prisma.UserWhereInput = {
  role: "USER",
};

/** Prisma filter — registered customers with verified email (excludes admin & incomplete signups) */
export const verifiedCustomerWhere: Prisma.UserWhereInput = {
  role: "USER",
  emailVerified: { not: null },
};

export function isVerifiedCustomerToken(token: {
  sub?: string;
  role?: string;
  emailVerified?: boolean;
} | null) {
  return Boolean(token?.sub && token.role === "USER");
}
