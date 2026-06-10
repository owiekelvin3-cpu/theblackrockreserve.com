import { DEFAULT_LOCALE, getLocaleDefinition, type LocaleCode } from "@/lib/i18n/locales";
import { createServerTranslator } from "@/lib/i18n/server";

const BRAND = "BlackrockReserve";
const ACCENT = "#FF5F05";
const BG = "#0a0a0f";
const CARD = "#12121a";

function layout(content: string, preheader: string, locale: LocaleCode = DEFAULT_LOCALE) {
  const { dir } = getLocaleDefinition(locale);
  const brand = "BlackrockReserve";
  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${brand}</title>
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
                <span style="color:#fff;font-weight:800;font-size:20px;">B</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${brand}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;color:#c8c8d0;font-size:15px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;text-align:center;color:#6b6b7b;font-size:12px;line-height:1.5;">
              © ${new Date().getFullYear()} ${brand}. All rights reserved.<br />
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

function otpBlock(code: string, minutes: number, t: (key: string, vars?: Record<string, string | number>) => string) {
  return `
    <p style="margin:0 0 20px;color:#ffffff;font-size:16px;">${t("emails.otpLabel")}</p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:16px 32px;background:rgba(255,95,5,0.12);border:1px solid rgba(255,95,5,0.35);border-radius:14px;color:${ACCENT};font-size:32px;font-weight:800;letter-spacing:8px;font-family:monospace;">${code}</span>
    </div>
    <p style="margin:0;color:#9a9aa8;font-size:13px;">${t("emails.otpExpires", { minutes })}</p>
  `;
}

export function verificationEmail(name: string, code: string, locale: LocaleCode = DEFAULT_LOCALE) {
  const { t } = createServerTranslator(locale);
  const brand = t("emails.brand");
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">${t("emails.verifyWelcome", { name })}</p>
      <p style="margin:0 0 24px;">${t("emails.verifyBody")}</p>
      ${otpBlock(code, 15, t)}
    `,
    t("emails.verifySubject", { code, brand }),
    locale
  );
  return {
    subject: t("emails.verifySubject", { code, brand }),
    html,
    text: t("emails.verifyText", { brand, name, code }),
  };
}

export function passwordResetEmail(name: string, code: string, locale: LocaleCode = DEFAULT_LOCALE) {
  const { t } = createServerTranslator(locale);
  const brand = t("emails.brand");
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">${t("emails.resetTitle")}</p>
      <p style="margin:0 0 24px;">${t("emails.resetBody", { name })}</p>
      ${otpBlock(code, 30, t)}
      <p style="margin:24px 0 0;color:#9a9aa8;font-size:13px;">${t("emails.resetIgnore")}</p>
    `,
    t("emails.resetSubject", { code, brand }),
    locale
  );
  return {
    subject: t("emails.resetSubject", { code, brand }),
    html,
    text: t("emails.resetText", { name, code }),
  };
}

export function welcomeEmail(name: string, locale: LocaleCode = DEFAULT_LOCALE) {
  const { t } = createServerTranslator(locale);
  const brand = t("emails.brand");
  const siteUrl = process.env.NEXTAUTH_URL ?? "https://www.blackrockreserve.site";
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">${t("emails.welcomeTitle", { name })}</p>
      <p style="margin:0 0 24px;">${t("emails.welcomeBody")}</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${siteUrl}/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:15px;">${t("emails.welcomeCta")}</a>
      </div>
    `,
    t("emails.welcomeSubject", { brand }),
    locale
  );
  return {
    subject: t("emails.welcomeSubject", { brand }),
    html,
    text: `${t("emails.welcomeTitle", { name })} ${siteUrl}/dashboard`,
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
export function jointAccountInviteEmail(data: {
  inviteeName: string;
  inviterName: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Joint account invitation</p>
      <p style="margin:0 0 16px;">Hi ${data.inviteeName},</p>
      <p style="margin:0 0 24px;"><strong style="color:#fff;">${data.inviterName}</strong> has invited you to open a joint investment account on Blackrock Reserve. You'll share ownership, portfolio visibility, and coordinated approvals for large transactions.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${data.siteUrl}/dashboard/joint-accounts" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:15px;">Review Invitation</a>
      </div>
    `,
    `${data.inviterName} invited you to a joint account`
  );
  return {
    subject: `${BRAND} — Joint account invitation from ${data.inviterName}`,
    html,
    text: `Hi ${data.inviteeName}, ${data.inviterName} invited you to a joint account. Visit ${data.siteUrl}/dashboard/joint-accounts`,
  };
}

export function platformInviteEmail(data: {
  inviteeName: string;
  inviterName: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">You're invited to Blackrock Reserve</p>
      <p style="margin:0 0 16px;">Hi ${data.inviteeName},</p>
      <p style="margin:0 0 24px;"><strong style="color:#fff;">${data.inviterName}</strong> would like to open a joint investment account with you, but we couldn't find a registered account matching your details.</p>
      <p style="margin:0 0 24px;">Create your free account to join the platform and accept the joint account invitation.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${data.siteUrl}/register" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:15px;">Create Account</a>
      </div>
    `,
    "Join Blackrock Reserve to open a joint account"
  );
  return {
    subject: `${BRAND} — ${data.inviterName} invited you to join`,
    html,
    text: `Hi ${data.inviteeName}, ${data.inviterName} invited you to join ${BRAND} for a joint account. Register at ${data.siteUrl}/register`,
  };
}

export function profitAddedEmail(data: {
  name: string;
  amount: string;
  profitBalance: string;
  mainBalance: string;
  reason: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Investment profit credited</p>
      <p style="margin:0 0 16px;">Hi ${data.name},</p>
      <p style="margin:0 0 16px;">An administrator has credited <strong style="color:#fff;">${data.amount}</strong> to your investment profit balance.</p>
      <div style="padding:16px;background:rgba(255,95,5,0.08);border-radius:12px;border:1px solid rgba(255,95,5,0.25);margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#9a9aa8;font-size:13px;">Reason</p>
        <p style="margin:0;color:#fff;">${data.reason}</p>
      </div>
      <p style="margin:0 0 8px;"><strong style="color:#fff;">Updated profit balance:</strong> ${data.profitBalance}</p>
      <p style="margin:0 0 24px;"><strong style="color:#fff;">Updated main balance:</strong> ${data.mainBalance}</p>
      <p style="margin:0;color:#9a9aa8;font-size:13px;">Credited on ${new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
      <div style="text-align:center;margin:28px 0 0;">
        <a href="${data.siteUrl}/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:15px;">View Dashboard</a>
      </div>
    `,
    `Profit of ${data.amount} credited to your account`
  );
  return {
    subject: `${BRAND} — ${data.amount} investment profit credited`,
    html,
    text: `Hi ${data.name}, ${data.amount} was credited to your profit balance. Profit: ${data.profitBalance}. Main: ${data.mainBalance}. Reason: ${data.reason}`,
  };
}

export function profitRemovedEmail(data: {
  name: string;
  amount: string;
  profitBalance: string;
  mainBalance: string;
  reason: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Investment profit adjusted</p>
      <p style="margin:0 0 16px;">Hi ${data.name},</p>
      <p style="margin:0 0 16px;">An administrator has removed <strong style="color:#fff;">${data.amount}</strong> from your investment profit balance.</p>
      <div style="padding:16px;background:rgba(255,255,255,0.04);border-radius:12px;border:1px solid rgba(255,255,255,0.08);margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#9a9aa8;font-size:13px;">Reason</p>
        <p style="margin:0;color:#fff;">${data.reason}</p>
      </div>
      <p style="margin:0 0 8px;"><strong style="color:#fff;">Updated profit balance:</strong> ${data.profitBalance}</p>
      <p style="margin:0 0 24px;"><strong style="color:#fff;">Updated main balance:</strong> ${data.mainBalance}</p>
      <div style="text-align:center;margin:28px 0 0;">
        <a href="${data.siteUrl}/dashboard" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:15px;">View Dashboard</a>
      </div>
    `,
    `Profit adjustment of ${data.amount}`
  );
  return {
    subject: `${BRAND} — Investment profit adjustment`,
    html,
    text: `Hi ${data.name}, ${data.amount} was removed from your profit balance. Profit: ${data.profitBalance}. Main: ${data.mainBalance}. Reason: ${data.reason}`,
  };
}

export function investmentConfirmationEmail(data: {
  name: string;
  symbol: string;
  assetName: string;
  amountUsd: string;
  shares: string;
  fee: string;
  totalCost: string;
  newBalance: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      <p style="margin:0 0 8px;color:#ffffff;font-size:18px;font-weight:600;">Investment confirmed</p>
      <p style="margin:0 0 16px;">Hi ${data.name},</p>
      <p style="margin:0 0 16px;">Your investment order has been executed successfully.</p>
      <div style="padding:16px;background:rgba(255,95,5,0.08);border-radius:12px;border:1px solid rgba(255,95,5,0.25);margin-bottom:16px;">
        <p style="margin:0 0 8px;color:#9a9aa8;font-size:13px;">Asset</p>
        <p style="margin:0 0 12px;color:#fff;font-weight:600;">${data.symbol} — ${data.assetName}</p>
        <p style="margin:0 0 4px;color:#9a9aa8;font-size:13px;">Amount invested</p>
        <p style="margin:0 0 12px;color:#fff;">${data.amountUsd}</p>
        <p style="margin:0 0 4px;color:#9a9aa8;font-size:13px;">Shares purchased</p>
        <p style="margin:0 0 12px;color:#fff;">${data.shares}</p>
        <p style="margin:0 0 4px;color:#9a9aa8;font-size:13px;">Fee</p>
        <p style="margin:0 0 12px;color:#fff;">${data.fee}</p>
        <p style="margin:0 0 4px;color:#9a9aa8;font-size:13px;">Total debited</p>
        <p style="margin:0;color:#fff;font-weight:600;">${data.totalCost}</p>
      </div>
      <p style="margin:0 0 24px;"><strong style="color:#fff;">Remaining balance:</strong> ${data.newBalance}</p>
      <div style="text-align:center;margin:8px 0 0;">
        <a href="${data.siteUrl}/dashboard/capital-markets" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,${ACCENT},#ff0000);color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;font-size:15px;">View Portfolio</a>
      </div>
    `,
    `Investment in ${data.symbol} confirmed`
  );
  return {
    subject: `${BRAND} — Investment in ${data.symbol} confirmed`,
    html,
    text: `Hi ${data.name}, your investment in ${data.symbol} (${data.assetName}) for ${data.amountUsd} is confirmed. Total debited: ${data.totalCost}. Balance: ${data.newBalance}.`,
  };
}

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
