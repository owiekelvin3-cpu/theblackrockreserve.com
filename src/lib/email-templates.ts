const BRAND = "Blackrock Reserve";
const ACCENT = "#FF5F05";
const BG = "#0a0a0f";
const CARD = "#12121a";

function layout(content: string, preheader: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:${CARD};border-radius:20px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,rgba(255,95,5,0.15),transparent);">
              <div style="width:48px;height:48px;margin:0 auto 16px;border-radius:14px;background:linear-gradient(135deg,${ACCENT},#ff0000);display:flex;align-items:center;justify-content:center;">
                <span style="color:#fff;font-weight:800;font-size:20px;">P</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${BRAND}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;color:#c8c8d0;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;text-align:center;color:#6b6b7b;font-size:12px;line-height:1.5;">
              © ${new Date().getFullYear()} ${BRAND}. All rights reserved.<br />
              This is an automated message — please do not reply directly.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpBlock(code: string, minutes: number) {
  return `
    <p style="margin:0 0 20px;color:#ffffff;font-size:16px;">Your verification code:</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:16px 32px;background:rgba(255,95,5,0.12);border:1px solid rgba(255,95,5,0.35);border-radius:14px;color:${ACCENT};font-size:32px;font-weight:800;letter-spacing:8px;font-family:monospace;">${code}</span>
    </div>
    <p style="margin:0;color:#9a9aa8;font-size:13px;">This code expires in <strong style="color:#fff;">${minutes} minutes</strong>. Never share it with anyone.</p>
  `;
}

export function verificationEmail(name: string, code: string) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Welcome, ${name}!</p>
      <p style="margin:0 0 24px;">Thank you for opening your account. Enter this code to verify your email and activate your dashboard.</p>
      ${otpBlock(code, 15)}
    `,
    `Your verification code is ${code}`
  );
  return {
    subject: `${code} is your ${BRAND} verification code`,
    html,
    text: `Welcome to ${BRAND}, ${name}!\n\nYour verification code: ${code}\n\nExpires in 15 minutes.`,
  };
}

export function passwordResetEmail(name: string, code: string) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Password reset</p>
      <p style="margin:0 0 24px;">Hi ${name}, we received a request to reset your password. Use the code below on the reset page.</p>
      ${otpBlock(code, 30)}
      <p style="margin:24px 0 0;color:#9a9aa8;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
    `,
    `Your password reset code is ${code}`
  );
  return {
    subject: `${code} — Reset your ${BRAND} password`,
    html,
    text: `Hi ${name},\n\nYour password reset code: ${code}\n\nExpires in 30 minutes.`,
  };
}

export function welcomeEmail(name: string) {
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://blackrockreserve.com";
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">You're all set, ${name}!</p>
      <p style="margin:0 0 24px;">Your email is verified and your Blackrock Reserve account is active. Access your dashboard to manage accounts, investments, and deposits.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${siteUrl}/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:15px;">Go to Dashboard</a>
      </div>
    `,
    `Welcome to ${BRAND} — your account is ready`
  );
  return {
    subject: `Welcome to ${BRAND}, ${name}!`,
    html,
    text: `Welcome ${name}! Your account is ready. Visit ${siteUrl}/dashboard`,
  };
}

export function contactNotificationEmail(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">New contact message</p>
      <p style="margin:0 0 16px;"><strong style="color:#fff;">From:</strong> ${data.name} &lt;${data.email}&gt;</p>
      <p style="margin:0 0 16px;"><strong style="color:#fff;">Subject:</strong> ${data.subject}</p>
      <div style="padding:16px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0;white-space:pre-wrap;">${data.message}</p>
      </div>
    `,
    `New message from ${data.name}`
  );
  return {
    subject: `[Contact] ${data.subject}`,
    html,
    text: `From: ${data.name} (${data.email})\nSubject: ${data.subject}\n\n${data.message}`,
  };
}

export function depositApprovedEmail(data: { name: string; amount: string; siteUrl: string }) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Deposit confirmed</p>
      <p style="margin:0 0 16px;">Hi ${data.name},</p>
      <p style="margin:0 0 16px;">Your deposit of <strong style="color:#fff;">${data.amount}</strong> has been verified and credited to your account. The funds are now available in your balance.</p>
      <p style="margin:0;"><a href="${data.siteUrl}/dashboard" style="color:${ACCENT};">View your dashboard →</a></p>
    `,
    "Your deposit has been credited"
  );
  return {
    subject: `${BRAND} — Deposit confirmed`,
    html,
    text: `Hi ${data.name}, your deposit of ${data.amount} has been credited and is available in your account. Visit ${data.siteUrl}/dashboard`,
  };
}

export function depositRejectedEmail(data: { name: string; reason: string; siteUrl: string }) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Deposit could not be processed</p>
      <p style="margin:0 0 16px;">Hi ${data.name},</p>
      <p style="margin:0 0 16px;">We were unable to confirm your recent deposit at this time.</p>
      <div style="padding:16px;background:rgba(255,0,0,0.08);border-radius:12px;border:1px solid rgba(255,0,0,0.2);margin-bottom:16px;">
        <p style="margin:0;color:#fca5a5;"><strong>Reason:</strong> ${data.reason}</p>
      </div>
      <p style="margin:0;">Contact support if you believe this is an error, or submit a new deposit from your dashboard.</p>
    `,
    "Your deposit request was not approved"
  );
  return {
    subject: `${BRAND} — Deposit request update`,
    html,
    text: `Hi ${data.name}, your deposit was not approved. Reason: ${data.reason}`,
  };
}

/** Generic alert sent to the user's registered Gmail for in-app notifications */
export function userNotificationEmail(data: {
  name: string;
  title: string;
  message: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">${data.title}</p>
      <p style="margin:0 0 16px;">Hi ${data.name},</p>
      <p style="margin:0 0 24px;">${data.message}</p>
      <div style="text-align:center;margin:8px 0 0;">
        <a href="${data.siteUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:14px;">Open Dashboard</a>
      </div>
    `,
    data.title
  );
  return {
    subject: `${BRAND} — ${data.title}`,
    html,
    text: `Hi ${data.name},\n\n${data.title}\n\n${data.message}\n\nView your account: ${data.siteUrl}/dashboard`,
  };
}
