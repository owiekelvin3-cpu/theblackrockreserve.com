import { DEFAULT_LOCALE, getLocaleDefinition, type LocaleCode } from "@/lib/i18n/locales";
import { createServerTranslator } from "@/lib/i18n/server";
import { getSiteUrl } from "@/lib/site-url";
import { pwaIconUrl } from "@/lib/pwa-icon-version";

const BRAND = "Blackrock Reserve";
const ACCENT = "#E85D04";
const ACCENT_LIGHT = "#FFF4ED";
const TEXT = "#141820";
const TEXT_SECONDARY = "#4B5563";
const TEXT_MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const BG_PAGE = "#F3F4F6";
const BG_CARD = "#FFFFFF";
const DANGER_BG = "#FEF2F2";
const DANGER_BORDER = "#FECACA";

function brandLogoUrl(): string {
  return `${getSiteUrl()}${pwaIconUrl("/apple-icon.png")}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailButton(href: string, label: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
      <tr>
        <td align="center" style="border-radius:8px;background:${ACCENT};">
          <a href="${href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1.2;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function emailHeading(title: string): string {
  return `<h1 style="margin:0 0 12px;color:${TEXT};font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;">${title}</h1>`;
}

function emailGreeting(name: string): string {
  return `<p style="margin:0 0 20px;color:${TEXT_SECONDARY};font-size:15px;line-height:1.6;">Dear ${escapeHtml(name)},</p>`;
}

function emailParagraph(text: string): string {
  return `<p style="margin:0 0 16px;color:${TEXT_SECONDARY};font-size:15px;line-height:1.65;">${text}</p>`;
}

function emailInfoCard(rows: { label: string; value: string }[]): string {
  const body = rows
    .map(
      (row, index) => `
        <tr>
          <td style="padding:${index === 0 ? "0" : "12px"} 0 4px;color:${TEXT_MUTED};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">${row.label}</td>
        </tr>
        <tr>
          <td style="padding:0 0 ${index === rows.length - 1 ? "0" : "16px"};color:${TEXT};font-size:15px;font-weight:600;line-height:1.5;">${row.value}</td>
        </tr>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#F9FAFB;border:1px solid ${BORDER};border-radius:12px;">
      <tr>
        <td style="padding:20px 22px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${body}</table>
        </td>
      </tr>
    </table>`;
}

function emailHighlightBox(content: string, tone: "neutral" | "accent" | "danger" = "neutral"): string {
  const styles = {
    neutral: { bg: "#F9FAFB", border: BORDER, text: TEXT },
    accent: { bg: ACCENT_LIGHT, border: "#FDBA74", text: TEXT },
    danger: { bg: DANGER_BG, border: DANGER_BORDER, text: "#991B1B" },
  }[tone];

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
      <tr>
        <td style="padding:16px 18px;background:${styles.bg};border:1px solid ${styles.border};border-radius:10px;color:${styles.text};font-size:14px;line-height:1.6;">
          ${content}
        </td>
      </tr>
    </table>`;
}

function emailSecurityNote(text: string): string {
  return emailHighlightBox(
    `<strong style="color:${TEXT};">Security reminder:</strong> ${text}`,
    "accent"
  );
}

function layout(content: string, preheader: string, locale: LocaleCode = DEFAULT_LOCALE) {
  const { dir } = getLocaleDefinition(locale);
  const siteUrl = getSiteUrl();
  const logoUrl = brandLogoUrl();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_PAGE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:${BG_CARD};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.06);">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#FF8C42 0%,${ACCENT} 55%,#C2410C 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid ${BORDER};background:linear-gradient(180deg,#FFFFFF 0%,#FAFAFA 100%);">
              <a href="${siteUrl}" style="text-decoration:none;display:inline-block;">
                <img src="${logoUrl}" width="56" height="56" alt="${BRAND}" style="display:block;margin:0 auto 14px;border-radius:14px;border:0;" />
                <div style="font-size:21px;font-weight:700;color:${TEXT};letter-spacing:-0.03em;line-height:1.2;">
                  Blackrock <span style="color:${ACCENT};">Reserve</span>
                </div>
                <div style="margin-top:6px;font-size:12px;font-weight:600;color:${TEXT_MUTED};letter-spacing:0.12em;text-transform:uppercase;">
                  Secure Banking &amp; Investments
                </div>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;color:${TEXT_SECONDARY};font-size:15px;line-height:1.65;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ${BORDER};">
                <tr>
                  <td style="padding-top:24px;text-align:center;">
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:${TEXT_MUTED};">
                      This message was sent by ${BRAND} regarding your account activity.
                    </p>
                    <p style="margin:0 0 14px;font-size:13px;line-height:1.6;">
                      <a href="${siteUrl}/dashboard" style="color:${ACCENT};text-decoration:none;font-weight:600;">Dashboard</a>
                      <span style="color:${BORDER};padding:0 8px;">|</span>
                      <a href="${siteUrl}/contact" style="color:${ACCENT};text-decoration:none;font-weight:600;">Support</a>
                      <span style="color:${BORDER};padding:0 8px;">|</span>
                      <a href="${siteUrl}/privacy" style="color:${ACCENT};text-decoration:none;font-weight:600;">Privacy</a>
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
                      © ${year} ${BRAND}. All rights reserved.<br />
                      Please do not reply to this automated message. For assistance, contact support through your dashboard.
                    </p>
                  </td>
                </tr>
              </table>
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
    ${emailSecurityNote(t("emails.otpExpires", { minutes }))}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 20px;">
      <tr>
        <td align="center" style="padding:22px 16px;background:${ACCENT_LIGHT};border:1px solid #FDBA74;border-radius:12px;">
          <p style="margin:0 0 10px;color:${TEXT_MUTED};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">${t("emails.otpLabel")}</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:${ACCENT};font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;">${code}</div>
        </td>
      </tr>
    </table>`;
}

export function verificationEmail(name: string, code: string, locale: LocaleCode = DEFAULT_LOCALE) {
  const { t } = createServerTranslator(locale);
  const brand = t("emails.brand");
  const html = layout(
    `
      ${emailHeading(t("emails.verifyWelcome", { name: escapeHtml(name) }))}
      ${emailParagraph(t("emails.verifyBody"))}
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
      ${emailHeading(t("emails.resetTitle"))}
      ${emailGreeting(name)}
      ${emailParagraph(t("emails.resetBody", { name: escapeHtml(name) }))}
      ${otpBlock(code, 30, t)}
      ${emailParagraph(`<span style="color:${TEXT_MUTED};font-size:13px;">${t("emails.resetIgnore")}</span>`)}
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
  const siteUrl = getSiteUrl();
  const html = layout(
    `
      ${emailHeading(t("emails.welcomeTitle", { name: escapeHtml(name) }))}
      ${emailParagraph(t("emails.welcomeBody"))}
      ${emailInfoCard([
        { label: "Account status", value: "Verified and active" },
        { label: "Secure access", value: "Sign in anytime from your dashboard" },
      ])}
      ${emailButton(`${siteUrl}/dashboard`, t("emails.welcomeCta"))}
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
      ${emailHeading("New contact message")}
      ${emailInfoCard([
        { label: "From", value: `${escapeHtml(data.name)} &lt;${escapeHtml(data.email)}&gt;` },
        { label: "Subject", value: escapeHtml(data.subject) },
      ])}
      ${emailHighlightBox(`<span style="white-space:pre-wrap;">${escapeHtml(data.message)}</span>`)}
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
      ${emailHeading("Deposit confirmed")}
      ${emailGreeting(data.name)}
      ${emailParagraph(`Your deposit of <strong style="color:${TEXT};">${escapeHtml(data.amount)}</strong> has been verified and credited to your account. Funds are now available in your balance.`)}
      ${emailInfoCard([
        { label: "Amount credited", value: escapeHtml(data.amount) },
        { label: "Status", value: "Completed" },
      ])}
      ${emailButton(`${data.siteUrl}/dashboard`, "View Dashboard")}
    `,
    "Your deposit has been credited"
  );
  return {
    subject: `${BRAND} — Deposit confirmed`,
    html,
    text: `Dear ${data.name}, your deposit of ${data.amount} has been credited and is available in your account. Visit ${data.siteUrl}/dashboard`,
  };
}

export function depositRejectedEmail(data: { name: string; reason: string; siteUrl: string }) {
  const html = layout(
    `
      ${emailHeading("Deposit could not be processed")}
      ${emailGreeting(data.name)}
      ${emailParagraph("We were unable to confirm your recent deposit at this time.")}
      ${emailHighlightBox(`<strong>Reason:</strong> ${escapeHtml(data.reason)}`, "danger")}
      ${emailParagraph("If you believe this is an error, please contact support or submit a new deposit from your dashboard.")}
      ${emailButton(`${data.siteUrl}/dashboard/deposit`, "Go to Deposits")}
    `,
    "Your deposit request was not approved"
  );
  return {
    subject: `${BRAND} — Deposit request update`,
    html,
    text: `Dear ${data.name}, your deposit was not approved. Reason: ${data.reason}`,
  };
}

export function jointAccountInviteEmail(data: {
  inviteeName: string;
  inviterName: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      ${emailHeading("Joint account invitation")}
      ${emailGreeting(data.inviteeName)}
      ${emailParagraph(`<strong style="color:${TEXT};">${escapeHtml(data.inviterName)}</strong> has invited you to open a joint investment account on ${BRAND}. You will share ownership, portfolio visibility, and coordinated approvals for large transactions.`)}
      ${emailButton(`${data.siteUrl}/dashboard/joint-accounts`, "Review Invitation")}
    `,
    `${data.inviterName} invited you to a joint account`
  );
  return {
    subject: `${BRAND} — Joint account invitation from ${data.inviterName}`,
    html,
    text: `Dear ${data.inviteeName}, ${data.inviterName} invited you to a joint account. Visit ${data.siteUrl}/dashboard/joint-accounts`,
  };
}

export function platformInviteEmail(data: {
  inviteeName: string;
  inviterName: string;
  siteUrl: string;
}) {
  const html = layout(
    `
      ${emailHeading(`You're invited to ${BRAND}`)}
      ${emailGreeting(data.inviteeName)}
      ${emailParagraph(`<strong style="color:${TEXT};">${escapeHtml(data.inviterName)}</strong> would like to open a joint investment account with you, but we could not find a registered account matching your details.`)}
      ${emailParagraph("Create your free account to join the platform and accept the joint account invitation.")}
      ${emailButton(`${data.siteUrl}/register`, "Create Account")}
    `,
    "Join Blackrock Reserve to open a joint account"
  );
  return {
    subject: `${BRAND} — ${data.inviterName} invited you to join`,
    html,
    text: `Dear ${data.inviteeName}, ${data.inviterName} invited you to join ${BRAND} for a joint account. Register at ${data.siteUrl}/register`,
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
  const creditedOn = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const html = layout(
    `
      ${emailHeading("Investment profit credited")}
      ${emailGreeting(data.name)}
      ${emailParagraph(`<strong style="color:${TEXT};">${escapeHtml(data.amount)}</strong> has been added to your profit balance.`)}
      ${emailInfoCard([
        { label: "Amount credited", value: escapeHtml(data.amount) },
        { label: "Updated profit balance", value: escapeHtml(data.profitBalance) },
        { label: "Reason", value: escapeHtml(data.reason) },
        { label: "Date", value: creditedOn },
      ])}
      ${emailParagraph(`<span style="color:${TEXT_MUTED};font-size:13px;">Withdraw profits to your main balance from the dashboard when you are ready to spend them.</span>`)}
      ${emailButton(`${data.siteUrl}/dashboard`, "View Dashboard")}
    `,
    `Profit of ${data.amount} credited to your account`
  );
  return {
    subject: `${BRAND} — ${data.amount} investment profit credited`,
    html,
    text: `Dear ${data.name}, ${data.amount} was credited to your profit balance. Profit: ${data.profitBalance}. Withdraw from the dashboard to move funds to your main balance. Reason: ${data.reason}`,
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
      ${emailHeading("Investment profit adjusted")}
      ${emailGreeting(data.name)}
      ${emailParagraph(`<strong style="color:${TEXT};">${escapeHtml(data.amount)}</strong> has been removed from your investment profit balance.`)}
      ${emailInfoCard([
        { label: "Amount adjusted", value: escapeHtml(data.amount) },
        { label: "Updated profit balance", value: escapeHtml(data.profitBalance) },
        { label: "Reason", value: escapeHtml(data.reason) },
      ])}
      ${emailButton(`${data.siteUrl}/dashboard`, "View Dashboard")}
    `,
    `Profit adjustment of ${data.amount}`
  );
  return {
    subject: `${BRAND} — Investment profit adjustment`,
    html,
    text: `Dear ${data.name}, ${data.amount} was removed from your profit balance. Profit: ${data.profitBalance}. Reason: ${data.reason}`,
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
      ${emailHeading("Investment confirmed")}
      ${emailGreeting(data.name)}
      ${emailParagraph("Your investment order has been executed successfully.")}
      ${emailInfoCard([
        { label: "Asset", value: `${escapeHtml(data.symbol)} — ${escapeHtml(data.assetName)}` },
        { label: "Amount invested", value: escapeHtml(data.amountUsd) },
        { label: "Shares purchased", value: escapeHtml(data.shares) },
        { label: "Fee", value: escapeHtml(data.fee) },
        { label: "Total debited", value: escapeHtml(data.totalCost) },
        { label: "Remaining balance", value: escapeHtml(data.newBalance) },
      ])}
      ${emailButton(`${data.siteUrl}/dashboard/capital-markets`, "View Portfolio")}
    `,
    `Investment in ${data.symbol} confirmed`
  );
  return {
    subject: `${BRAND} — Investment in ${data.symbol} confirmed`,
    html,
    text: `Dear ${data.name}, your investment in ${data.symbol} (${data.assetName}) for ${data.amountUsd} is confirmed. Total debited: ${data.totalCost}. Balance: ${data.newBalance}.`,
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
      ${emailHeading(escapeHtml(data.title))}
      ${emailGreeting(data.name)}
      ${emailHighlightBox(escapeHtml(data.message))}
      ${emailButton(`${data.siteUrl}/dashboard`, "Open Dashboard")}
    `,
    data.title
  );
  return {
    subject: `${BRAND} — ${data.title}`,
    html,
    text: `Dear ${data.name},\n\n${data.title}\n\n${data.message}\n\nView your account: ${data.siteUrl}/dashboard`,
  };
}
