import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resendOtpSchema } from "@/lib/validations";
import { generateOtp, sendEmail, isEmailConfigured } from "@/lib/email";
import { passwordResetEmail, verificationEmail } from "@/lib/email-templates";
import { getServerLocale, getUserLocale } from "@/lib/i18n/server";
import { parseLocaleCode } from "@/lib/i18n/locales";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { email, purpose } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ message: "If an account exists, a new code has been sent." });
    }

    if (purpose === "verify" && user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    const otp = generateOtp();
    const expiresMs = purpose === "verify" ? 15 * 60 * 1000 : 30 * 60 * 1000;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpires: new Date(Date.now() + expiresMs),
      },
    });

    const locale = parseLocaleCode(user.preferredLocale) ?? (await getUserLocale(user.id)) ?? (await getServerLocale());
    const mail =
      purpose === "verify"
        ? verificationEmail(user.name, otp, locale)
        : passwordResetEmail(user.name, otp, locale);

    await sendEmail({ to: email, ...mail });

    const devMode = !isEmailConfigured() && process.env.NODE_ENV === "development";

    return NextResponse.json({
      message: "A new verification code has been sent.",
      ...(devMode && { devOtp: otp }),
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    const message =
      error instanceof Error && error.message.includes("Email")
        ? error.message
        : "Failed to resend code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
