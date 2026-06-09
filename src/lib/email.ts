import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { Resend } from "resend";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

let gmailTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;
let resendClient: Resend | null = null;

export type EmailProvider = "resend" | "gmail" | "none";

export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  if (process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim()) return "gmail";
  return "none";
}

export function isEmailConfigured(): boolean {
  return getEmailProvider() !== "none";
}

export function getFromAddress(): string {
  if (process.env.EMAIL_FROM?.trim()) return process.env.EMAIL_FROM.trim();

  if (getEmailProvider() === "resend") {
    return "BlackrockReserve <noreply@blackrockreserve.site>";
  }

  const gmail = process.env.GMAIL_USER?.trim();
  if (gmail) return `"BlackrockReserve" <${gmail}>`;

  return "BlackrockReserve <noreply@blackrockreserve.site>";
}

function getGmailTransporter() {
  if (gmailTransporter) return gmailTransporter;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD.");
  }

  gmailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return gmailTransporter;
}

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Resend not configured. Set RESEND_API_KEY.");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

async function sendViaResend(options: SendEmailOptions) {
  const { data, error } = await getResendClient().emails.send({
    from: getFromAddress(),
    to: [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function sendViaGmail(options: SendEmailOptions) {
  await getGmailTransporter().sendMail({
    from: getFromAddress(),
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<{ sent: boolean; dev?: boolean; provider?: EmailProvider }> {
  const provider = getEmailProvider();

  if (provider === "none") {
    if (process.env.NODE_ENV === "development") {
      console.log(`\n[DEV EMAIL]\nTo: ${options.to}\nSubject: ${options.subject}\n${options.text}\n`);
      return { sent: true, dev: true, provider: "none" };
    }
    throw new Error("Email service is not configured. Set RESEND_API_KEY or Gmail credentials.");
  }

  if (provider === "resend") {
    await sendViaResend(options);
  } else {
    await sendViaGmail(options);
  }

  return { sent: true, provider };
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
