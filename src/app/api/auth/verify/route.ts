import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { getUserLocale } from "@/lib/i18n/server";
import { parseLocaleCode } from "@/lib/i18n/locales";
import { ensureUserBankAccounts } from "@/lib/dashboard-data";
import { getClientIp } from "@/lib/admin-audit";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) ?? "unknown";
    const limited = checkRateLimit(`auth:verify:${ip}`, 15, 15 * 60 * 1000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid verification data" },
        { status: 400 }
      );
    }

    const { email, otp } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    if (user.otpCode !== otp) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      return NextResponse.json({ error: "Verification code expired. Request a new code." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        otpCode: null,
        otpExpires: null,
      },
    });

    await ensureUserBankAccounts(user.id);

    try {
      const locale = parseLocaleCode(user.preferredLocale) ?? (await getUserLocale(user.id));
      const mail = welcomeEmail(user.name, locale);
      await sendEmail({ to: email, ...mail });
    } catch (err) {
      console.error("Welcome email failed:", err);
    }

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
