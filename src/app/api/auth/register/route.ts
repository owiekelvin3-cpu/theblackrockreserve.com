import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerApiSchema } from "@/lib/validations";
import { generateOtp, sendEmail, isEmailConfigured } from "@/lib/email";
import { verificationEmail } from "@/lib/email-templates";

async function deliverVerificationEmail(name: string, email: string, otp: string) {
  const mail = verificationEmail(name, otp);
  const result = await sendEmail({ to: email, ...mail });
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid registration data" },
        { status: 400 }
      );
    }

    const { fullName, email, phone, dateOfBirth, password, accountType, kycIdFront, kycIdBack } =
      parsed.data;

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

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
          otpCode: otp,
          otpExpires,
        },
      });
      userId = updated.id;

      const accountCount = await prisma.bankAccount.count({ where: { userId } });
      if (accountCount === 0) {
        await prisma.bankAccount.create({
          data: {
            userId,
            name: "Primary Checking",
            type: "checking",
            currency: "USD",
            balance: 0,
          },
        });
      }
    } else {
      const created = await prisma.$transaction(async (tx) => {
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
            otpCode: otp,
            otpExpires,
          },
        });

        await tx.bankAccount.create({
          data: {
            userId: user.id,
            name: "Primary Checking",
            type: "checking",
            currency: "USD",
            balance: 0,
          },
        });

        return user;
      });
      userId = created.id;
    }

    let emailSent = false;
    let devOtp: string | undefined;

    try {
      const result = await deliverVerificationEmail(fullName, email, otp);
      emailSent = result.sent;
      if (result.dev) devOtp = otp;
    } catch (err) {
      console.error("Verification email failed:", err);
      if (process.env.NODE_ENV === "development") {
        console.log(`[DEV] OTP for ${email}: ${otp}`);
        devOtp = otp;
        emailSent = false;
      }
    }

    return NextResponse.json({
      message: emailSent
        ? "Account saved. Check your email for a verification code."
        : "Account saved. Use the verification code below to activate your account.",
      userId,
      emailSent,
      ...(devOtp && { devOtp }),
      ...(!isEmailConfigured() && process.env.NODE_ENV === "development" && !devOtp && { devOtp: otp }),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
