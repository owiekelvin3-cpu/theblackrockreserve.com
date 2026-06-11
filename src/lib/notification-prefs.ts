export type NotificationPrefs = {
  transactions: boolean;
  investments: boolean;
  security: boolean;
  marketing: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  transactions: true,
  investments: true,
  security: true,
  marketing: false,
};

export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
  const record = value as Record<string, unknown>;
  return {
    transactions: record.transactions !== false,
    investments: record.investments !== false,
    security: record.security !== false,
    marketing: record.marketing === true,
  };
}
