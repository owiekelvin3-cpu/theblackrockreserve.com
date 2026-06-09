import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { contactNotificationEmail } from "@/lib/email-templates";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid message" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    await prisma.contactMessage.create({ data });

    const notifyEmail =
      process.env.NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL ?? process.env.GMAIL_USER;
    if (notifyEmail && isEmailConfigured()) {
      try {
        const mail = contactNotificationEmail(data);
        await sendEmail({ to: notifyEmail, ...mail });
      } catch (err) {
        console.error("Contact notification email failed:", err);
      }
    }

    return NextResponse.json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("Contact error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
