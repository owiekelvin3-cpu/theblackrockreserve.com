import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations";
import { generateOtp, sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";
import { getServerLocale, getUserLocale } from "@/lib/i18n/server";
import { parseLocaleCode } from "@/lib/i18n/locales";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const otp = generateOtp();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpCode: otp,
          otpExpires: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      const locale = parseLocaleCode(user.preferredLocale) ?? (await getUserLocale(user.id)) ?? (await getServerLocale());
      const mail = passwordResetEmail(user.name, otp, locale);
      await sendEmail({ to: email, ...mail });
    }

    return NextResponse.json({
      message: "If an account exists, a verification code has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    const message =
      error instanceof Error && error.message.includes("Email")
        ? error.message
        : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
