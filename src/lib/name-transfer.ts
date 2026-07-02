export const NAME_TRANSFER_DESCRIPTION_PREFIX = "Transfer by name to ";

export function isNameOnlyTransferDescription(description: string): boolean {
  return description.trim().toLowerCase().startsWith(NAME_TRANSFER_DESCRIPTION_PREFIX.toLowerCase());
}

export function buildNameTransferDescription(recipientName: string, note?: string): string {
  const name = recipientName.trim();
  const memo = note?.trim();
  return memo
    ? `${NAME_TRANSFER_DESCRIPTION_PREFIX}${name} — ${memo}`
    : `${NAME_TRANSFER_DESCRIPTION_PREFIX}${name}`;
}

export function parseNameTransferRecipient(description: string): string | null {
  const match = description.trim().match(/^Transfer by name to (.+?)(?:\s+—\s+|$)/i);
  return match?.[1]?.trim() ?? null;
}
