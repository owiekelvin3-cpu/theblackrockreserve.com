import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM ??
    `"Blackrock Reserve" <${process.env.GMAIL_USER}>`
  );
}

function getTransporter() {
  if (transporter) return transporter;

  if (!isEmailConfigured()) {
    throw new Error("Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ sent: boolean; dev?: boolean }> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[DEV EMAIL]\nTo: ${options.to}\nSubject: ${options.subject}\n${options.text}\n`);
      return { sent: true, dev: true };
    }
    throw new Error("Email service is not configured");
  }

  await getTransporter().sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return { sent: true };
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
