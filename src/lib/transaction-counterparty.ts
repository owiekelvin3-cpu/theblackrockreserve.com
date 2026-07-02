import type { TransactionType, VerificationBadgeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INCOMING_TRANSFER_RE } from "@/lib/transaction-amount";
import { serializeVerificationBadge } from "@/lib/verification-badge";
import {
  isNameOnlyTransferDescription,
  parseNameTransferRecipient,
} from "@/lib/name-transfer";

export type CounterpartyPreview = {
  id: string | null;
  name: string;
  verificationBadge: VerificationBadgeType;
  relation: "sender" | "recipient";
};

const OUTGOING_TRANSFER_RE = /^transfer to\b/i;
const OUTGOING_NAME_TRANSFER_RE = /^transfer by name to\b/i;

export function isOutgoingNameTransfer(type: TransactionType | string, description: string): boolean {
  return type === "TRANSFER" && OUTGOING_NAME_TRANSFER_RE.test(description.trim());
}

export function isOutgoingMemberTransfer(type: TransactionType | string, description: string): boolean {
  const trimmed = description.trim();
  return (
    type === "TRANSFER" &&
    (OUTGOING_TRANSFER_RE.test(trimmed) || OUTGOING_NAME_TRANSFER_RE.test(trimmed))
  );
}

export function isIncomingMemberTransfer(type: TransactionType | string, description: string): boolean {
  return type === "TRANSFER" && INCOMING_TRANSFER_RE.test(description.trim());
}

export function parseTransferPartyName(
  description: string,
  direction: "incoming" | "outgoing"
): string | null {
  const trimmed = description.trim();
  if (direction === "outgoing" && isNameOnlyTransferDescription(trimmed)) {
    return parseNameTransferRecipient(trimmed);
  }
  const re =
    direction === "incoming"
      ? /^Transfer from (.+?)(?:\s+—\s+|$)/i
      : /^Transfer to (.+?)(?:\s+—\s+|$)/i;
  const match = trimmed.match(re);
  return match?.[1]?.trim() ?? null;
}

type TransactionRow = {
  id: string;
  type: TransactionType;
  description: string;
  counterpartyUserId?: string | null;
  counterparty?: {
    id: string;
    name: string;
    verificationBadge: VerificationBadgeType;
  } | null;
};

export async function resolveCounterpartyForTransaction(
  row: TransactionRow
): Promise<CounterpartyPreview | null> {
  if (row.type !== "TRANSFER") return null;

  const incoming = isIncomingMemberTransfer(row.type, row.description);
  const outgoing = isOutgoingMemberTransfer(row.type, row.description);
  if (!incoming && !outgoing) return null;

  if (row.counterparty) {
    return {
      id: row.counterparty.id,
      name: row.counterparty.name,
      verificationBadge: serializeVerificationBadge(row.counterparty.verificationBadge),
      relation: incoming ? "sender" : "recipient",
    };
  }

  if (row.counterpartyUserId) {
    const user = await prisma.user.findUnique({
      where: { id: row.counterpartyUserId },
      select: { id: true, name: true, verificationBadge: true },
    });
    if (user) {
      return {
        id: user.id,
        name: user.name,
        verificationBadge: serializeVerificationBadge(user.verificationBadge),
        relation: incoming ? "sender" : "recipient",
      };
    }
  }

  const parsedName = parseTransferPartyName(row.description, incoming ? "incoming" : "outgoing");
  if (!parsedName) return null;

  if (outgoing && isNameOnlyTransferDescription(row.description)) {
    return {
      id: null,
      name: parsedName,
      verificationBadge: "NONE",
      relation: "recipient",
    };
  }

  const user = await prisma.user.findFirst({
    where: { name: parsedName, role: "USER" },
    select: { id: true, name: true, verificationBadge: true },
    orderBy: { createdAt: "desc" },
  });

  if (!user) {
    return {
      id: null,
      name: parsedName,
      verificationBadge: "NONE",
      relation: incoming ? "sender" : "recipient",
    };
  }

  return {
    id: user.id,
    name: user.name,
    verificationBadge: serializeVerificationBadge(user.verificationBadge),
    relation: incoming ? "sender" : "recipient",
  };
}

export async function loadCounterpartiesForTransactions(
  rows: TransactionRow[]
): Promise<Map<string, CounterpartyPreview>> {
  const map = new Map<string, CounterpartyPreview>();
  const unresolved: TransactionRow[] = [];

  for (const row of rows) {
    if (row.type !== "TRANSFER") continue;

    const incoming = isIncomingMemberTransfer(row.type, row.description);
    const outgoing = isOutgoingMemberTransfer(row.type, row.description);
    if (!incoming && !outgoing) continue;

    if (row.counterparty) {
      map.set(row.id, {
        id: row.counterparty.id,
        name: row.counterparty.name,
        verificationBadge: serializeVerificationBadge(row.counterparty.verificationBadge),
        relation: incoming ? "sender" : "recipient",
      });
      continue;
    }

    if (row.counterpartyUserId) {
      unresolved.push(row);
      continue;
    }

    const parsedName = parseTransferPartyName(row.description, incoming ? "incoming" : "outgoing");
    if (parsedName) {
      if (outgoing && isNameOnlyTransferDescription(row.description)) {
        map.set(row.id, {
          id: null,
          name: parsedName,
          verificationBadge: "NONE",
          relation: "recipient",
        });
        continue;
      }
      unresolved.push(row);
    }
  }

  const counterpartyIds = Array.from(
    new Set(unresolved.map((r) => r.counterpartyUserId).filter((id): id is string => !!id))
  );

  const usersById = counterpartyIds.length
    ? new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: counterpartyIds } },
            select: { id: true, name: true, verificationBadge: true },
          })
        ).map((u) => [u.id, u])
      )
    : new Map<string, { id: string; name: string; verificationBadge: VerificationBadgeType }>();

  const namesToResolve = new Set<string>();
  for (const row of unresolved) {
    if (row.counterpartyUserId && usersById.has(row.counterpartyUserId)) continue;
    const incoming = isIncomingMemberTransfer(row.type, row.description);
    const name = parseTransferPartyName(row.description, incoming ? "incoming" : "outgoing");
    if (name) namesToResolve.add(name);
  }

  const usersByName = namesToResolve.size
    ? new Map(
        (
          await prisma.user.findMany({
            where: { name: { in: Array.from(namesToResolve) }, role: "USER" },
            select: { id: true, name: true, verificationBadge: true },
            orderBy: { createdAt: "desc" },
          })
        ).map((u) => [u.name, u])
      )
    : new Map<string, { id: string; name: string; verificationBadge: VerificationBadgeType }>();

  for (const row of unresolved) {
    const incoming = isIncomingMemberTransfer(row.type, row.description);
    const outgoing = !incoming;
    const relation: CounterpartyPreview["relation"] = incoming ? "sender" : "recipient";

    const linked = row.counterpartyUserId ? usersById.get(row.counterpartyUserId) : undefined;
    if (linked) {
      map.set(row.id, {
        id: linked.id,
        name: linked.name,
        verificationBadge: serializeVerificationBadge(linked.verificationBadge),
        relation,
      });
      continue;
    }

    const parsedName = parseTransferPartyName(row.description, incoming ? "incoming" : "outgoing");
    if (!parsedName) continue;

    if (outgoing && isNameOnlyTransferDescription(row.description)) {
      map.set(row.id, {
        id: null,
        name: parsedName,
        verificationBadge: "NONE",
        relation: "recipient",
      });
      continue;
    }

    const byName = usersByName.get(parsedName);
    map.set(row.id, {
      id: byName?.id ?? null,
      name: byName?.name ?? parsedName,
      verificationBadge: serializeVerificationBadge(byName?.verificationBadge),
      relation,
    });
  }

  return map;
}

export function parseMemberTransferSenderName(message: string): string | null {
  const match = message.match(/^(.+?)\s+sent you\s+/i);
  return match?.[1]?.trim() ?? null;
}

/** Returns the portion after the sender name, e.g. "sent you $50.00." */
export function parseMemberTransferNotificationTail(message: string, senderName: string | null): string {
  if (!senderName) return message;
  const prefix = `${senderName} `;
  if (message.startsWith(prefix)) return message.slice(prefix.length);
  return message;
}
