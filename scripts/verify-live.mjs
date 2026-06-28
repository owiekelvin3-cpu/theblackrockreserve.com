/**
 * Live verification script — run: node --env-file=.env scripts/verify-live.mjs
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.VERIFY_BASE ?? "https://theblackrockreserve-com.vercel.app";
const TEST_EMAIL = process.env.VERIFY_EMAIL ?? `br-verify-${Date.now()}@mailinator.com`;

const prisma = new PrismaClient();

async function request(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  const results = [];

  const pages = ["/", "/register", "/login", "/contact", "/admin/login"];
  for (const path of pages) {
    const res = await fetch(`${BASE}${path}`, { method: "HEAD" });
    results.push({ check: `page ${path}`, ok: res.ok, status: res.status });
  }

  const register = await request("/api/auth/register", {
    fullName: "Live Verify",
    email: TEST_EMAIL,
    phone: "5559876543",
    dateOfBirth: "1992-06-15",
    password: "VerifyPass1",
    accountType: "PERSONAL",
  });
  results.push({
    check: "register API",
    ok: register.status === 200,
    status: register.status,
    emailSent: register.json.emailSent,
    message: register.json.message,
  });

  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: { otpCode: true, emailVerified: true },
  });

  if (user?.otpCode) {
    const verify = await request("/api/auth/verify", {
      email: TEST_EMAIL,
      otp: user.otpCode,
    });
    results.push({
      check: "verify OTP API",
      ok: verify.status === 200,
      status: verify.status,
      message: verify.json.message ?? verify.json.error,
    });
  } else {
    results.push({ check: "verify OTP API", ok: false, error: "no OTP in database" });
  }

  const contact = await request("/api/contact", {
    name: "Live Verify",
    email: "verify@blackrockreserve.site",
    subject: "Verification ping",
    message: "Automated live verification contact test.",
  });
  results.push({
    check: "contact API",
    ok: contact.status === 200,
    status: contact.status,
  });

  const smtpCheck = await import("nodemailer").then(async (nodemailer) => {
    const user = process.env.GMAIL_USER?.trim() || process.env.SMTP_USER?.trim();
    const pass = (process.env.GMAIL_APP_PASSWORD ?? process.env.SMTP_PASSWORD ?? "").replace(/\s+/g, "");
    if (!user || !pass) return { ok: false, error: "GMAIL_USER / GMAIL_APP_PASSWORD missing locally" };
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    try {
      await transporter.verify();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "SMTP verify failed" };
    }
  });
  results.push({ check: "local SMTP connection", ...smtpCheck });

  // Remove the temporary verification account so it does not appear in admin/user lists
  const cleanup = await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
  results.push({ check: "cleanup test user", ok: true, removed: cleanup.count });

  console.log(JSON.stringify({ base: BASE, testEmail: TEST_EMAIL, results }, null, 2));

  const failed = results.filter((r) => !r.ok);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
