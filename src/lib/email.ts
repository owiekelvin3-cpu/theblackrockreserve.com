import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailProvider = "smtp" | "none";

let smtpTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

/** Google app passwords are often copied with spaces — strip them. */
export function normalizeSmtpPassword(raw: string | undefined): string {
  return (raw ?? "").replace(/\s+/g, "");
}

export function getSmtpUser(): string | null {
  const user = process.env.GMAIL_USER?.trim() || process.env.SMTP_USER?.trim();
  return user || null;
}

export function getSmtpPassword(): string | null {
  const pass = normalizeSmtpPassword(
    process.env.GMAIL_APP_PASSWORD ?? process.env.SMTP_PASSWORD
  );
  return pass || null;
}

export function getEmailProvider(): EmailProvider {
  return getSmtpUser() && getSmtpPassword() ? "smtp" : "none";
}

export function isEmailConfigured(): boolean {
  return getEmailProvider() !== "none";
}

export function getFromAddress(): string {
  if (process.env.EMAIL_FROM?.trim()) return process.env.EMAIL_FROM.trim();

  const user = getSmtpUser();
  if (user) return `"BlackrockReserve" <${user}>`;

  return "BlackrockReserve <noreply@theblackrockreserve.com>";
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;

  const user = getSmtpUser();
  const pass = getSmtpPassword();

  if (!user || !pass) {
    throw new Error(
      "SMTP not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD (or SMTP_USER and SMTP_PASSWORD)."
    );
  }

  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
    });
  } else {
    smtpTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return smtpTransporter;
}

async function sendViaSmtp(options: SendEmailOptions) {
  await getSmtpTransporter().sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendEmail(
  options: SendEmailOptions
): Promise<{ sent: boolean; dev?: boolean; provider?: EmailProvider }> {
  const provider = getEmailProvider();

  if (provider === "none") {
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[DEV EMAIL]\nTo: ${options.to}\nSubject: ${options.subject}\n${options.text}\n`);
      return { sent: true, dev: true, provider: "none" };
    }
    throw new Error(
      "Email service is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables."
    );
  }

  await sendViaSmtp(options);
  return { sent: true, provider: "smtp" };
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
