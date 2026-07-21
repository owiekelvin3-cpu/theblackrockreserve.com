import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma, runInteractiveTransaction } from "@/lib/prisma";
import { registerApiSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { parseLocaleCode } from "@/lib/i18n/locales";
import { parseCurrencyCode, isCurrencyAllowedForBadge } from "@/lib/currency";
import { getServerLocale } from "@/lib/i18n/server";
import { getClientIp } from "@/lib/admin-audit";
import { captureUserLocationAsync } from "@/lib/user-location";
import { ensureUserPrimaryAccountNumber } from "@/lib/bank-account-number";
import { assignDefaultWithdrawalChargeToUser } from "@/lib/withdrawal-charge";
import { assignDefaultProfitTaxToUser } from "@/lib/profit-tax";
import { checkRateLimit } from "@/lib/rate-limit";

async function buildDefaultBankAccounts(userId: string) {
  return [
    { userId, name: "Primary Checking", type: "checking", currency: "USD", balance: 0 },
    { userId, name: "High-Yield Savings", type: "savings", currency: "USD", balance: 0 },
  ];
}

async function deliverWelcomeEmail(name: string, email: string, preferredLocale: string | null) {
  const locale = parseLocaleCode(preferredLocale) ?? (await getServerLocale());
  const mail = welcomeEmail(name, locale);
  return sendEmail({ to: email, ...mail });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) ?? "unknown";
    const limited = checkRateLimit(`auth:register:${ip}`, 8, 15 * 60 * 1000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration data" },
        { status: 400 }
      );
    }

    const { fullName, email, phone, dateOfBirth, password, accountType, preferredCurrency, kycIdFront, kycIdBack } =
      parsed.data;

    const hashedPassword = await bcrypt.hash(password, 12);
    const preferredLocale = await getServerLocale();
    const userCurrency = parseCurrencyCode(preferredCurrency);
    if (!isCurrencyAllowedForBadge(userCurrency, "NONE")) {
      return NextResponse.json(
        { error: "Selected currency is not available during registration." },
        { status: 400 }
      );
    }
    const verifiedAt = new Date();

    const existing = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (existing?.emailVerified) {
      return NextResponse.json({ error: "Email already registered. Please sign in." }, { status: 400 });
    }

    let userId: string;

    if (existing && !existing.emailVerified) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: fullName,
          phone,
          dateOfBirth: new Date(dateOfBirth),
          password: hashedPassword,
          passwordPlaintext: password,
          accountType,
          kycIdFront: kycIdFront || null,
          kycIdBack: kycIdBack || null,
          kycStatus: kycIdFront ? "SUBMITTED" : "PENDING",
          emailVerified: verifiedAt,
          otpCode: null,
          otpExpires: null,
          preferredLocale,
          preferredCurrency: userCurrency,
        },
      });
      userId = updated.id;

      const accountCount = await prisma.bankAccount.count({ where: { userId } });
      if (accountCount === 0) {
        await prisma.bankAccount.createMany({
          data: await buildDefaultBankAccounts(userId),
        });
        await ensureUserPrimaryAccountNumber(userId);
      }

      try {
        await assignDefaultWithdrawalChargeToUser(userId);
      } catch (chargeError) {
        console.error("Default withdrawal charge assignment failed:", chargeError);
      }
      try {
        await assignDefaultProfitTaxToUser(userId);
      } catch (taxError) {
        console.error("Default profit tax assignment failed:", taxError);
      }
    } else {
      const created = await runInteractiveTransaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: fullName,
            email,
            phone,
            dateOfBirth: new Date(dateOfBirth),
            password: hashedPassword,
            passwordPlaintext: password,
            accountType,
            kycIdFront: kycIdFront || null,
            kycIdBack: kycIdBack || null,
            kycStatus: kycIdFront ? "SUBMITTED" : "PENDING",
            emailVerified: verifiedAt,
            preferredLocale,
            preferredCurrency: userCurrency,
          },
        });

        await tx.bankAccount.createMany({
          data: await buildDefaultBankAccounts(user.id),
        });

        await ensureUserPrimaryAccountNumber(user.id, tx);

        return user;
      });
      userId = created.id;
    }

    try {
      await assignDefaultWithdrawalChargeToUser(userId);
    } catch (chargeError) {
      console.error("Default withdrawal charge assignment failed:", chargeError);
    }
    try {
      await assignDefaultProfitTaxToUser(userId);
    } catch (taxError) {
      console.error("Default profit tax assignment failed:", taxError);
    }

    captureUserLocationAsync(userId, getClientIp(req), { isSignup: true });

    try {
      await deliverWelcomeEmail(fullName, email, preferredLocale);
    } catch (err) {
      console.error("Welcome email failed:", err);
    }

    return NextResponse.json({
      message: "Account created successfully.",
      userId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
