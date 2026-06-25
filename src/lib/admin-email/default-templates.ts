export const DEFAULT_EMAIL_TEMPLATES = [
  {
    slug: "welcome",
    name: "Welcome Email",
    subject: "Welcome to Blackrock Reserve",
    htmlBody:
      "<p>We are delighted to welcome you to <strong>Blackrock Reserve</strong> — your trusted partner for secure banking and investment services.</p><p>Your account is now active. Log in to explore your dashboard, fund your account, and access our capital markets.</p><p>If you have any questions, our support team is available through your dashboard.</p>",
  },
  {
    slug: "security-alert",
    name: "Security Alert",
    subject: "Important Security Notice",
    htmlBody:
      "<p>We detected activity on your account that requires your attention.</p><p><strong>What you should do:</strong></p><ul><li>Review your recent account activity</li><li>Update your password if you did not authorize this activity</li><li>Contact support immediately if you notice anything suspicious</li></ul><p>Your security is our top priority.</p>",
  },
  {
    slug: "account-update",
    name: "Account Update",
    subject: "Your Account Has Been Updated",
    htmlBody:
      "<p>This is to confirm that a change has been made to your Blackrock Reserve account.</p><p>Please log in to your dashboard to review the latest details. If you did not request this change, contact our support team immediately.</p>",
  },
  {
    slug: "maintenance-notice",
    name: "Maintenance Notice",
    subject: "Scheduled Platform Maintenance",
    htmlBody:
      "<p>We will be performing scheduled maintenance on the Blackrock Reserve platform to improve performance and security.</p><p><strong>Maintenance window:</strong> [Date and time]</p><p>During this period, some services may be temporarily unavailable. We apologize for any inconvenience and appreciate your patience.</p>",
  },
  {
    slug: "investment-update",
    name: "Investment Update",
    subject: "Investment Portfolio Update",
    htmlBody:
      "<p>Your investment portfolio has been updated.</p><p>Log in to your dashboard to view your latest holdings, performance metrics, and market opportunities available on our platform.</p><p>Our capital markets team continues to monitor market conditions on your behalf.</p>",
  },
  {
    slug: "promotional-announcement",
    name: "Promotional Announcement",
    subject: "Exclusive Offer for Blackrock Reserve Clients",
    htmlBody:
      "<p>As a valued Blackrock Reserve client, we are pleased to share an exclusive opportunity with you.</p><p>[Describe the promotion or announcement here]</p><p>This offer is available for a limited time. Visit your dashboard to learn more.</p>",
  },
  {
    slug: "support-response",
    name: "Support Response",
    subject: "Re: Your Support Request",
    htmlBody:
      "<p>Thank you for contacting Blackrock Reserve support.</p><p>[Your response here]</p><p>If you need further assistance, please reply through the support chat in your dashboard or contact us through our help center.</p>",
  },
  {
    slug: "withdrawal-notification",
    name: "Withdrawal Notification",
    subject: "Withdrawal Request Update",
    htmlBody:
      "<p>Your withdrawal request has been received and is being processed.</p><p>Our team will review your request and notify you once it has been completed. You can track the status in your dashboard under Withdrawals.</p>",
  },
  {
    slug: "deposit-notification",
    name: "Deposit Notification",
    subject: "Deposit Confirmation",
    htmlBody:
      "<p>Your deposit has been received and is being reviewed by our team.</p><p>Once verified, the funds will be credited to your account. You will receive a confirmation when the deposit is approved.</p><p>Thank you for banking with Blackrock Reserve.</p>",
  },
] as const;
