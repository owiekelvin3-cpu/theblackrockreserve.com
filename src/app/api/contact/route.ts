import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { contactNotificationEmail } from "@/lib/email-templates";
import { getPublicContactSettings } from "@/lib/platform-settings";

const FALLBACK_SUPPORT_INBOX = "blackrockreservesupport@gmail.com";

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

    const settings = await getPublicContactSettings().catch(() => null);
    const supportInbox =
      settings?.contactEmail?.trim() ||
      process.env.NOTIFY_EMAIL?.trim() ||
      process.env.ADMIN_EMAIL?.trim() ||
      FALLBACK_SUPPORT_INBOX;

    if (supportInbox && isEmailConfigured()) {
      try {
        const mail = contactNotificationEmail(data);
        await sendEmail({
          to: supportInbox,
          replyTo: data.email,
          ...mail,
        });
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
