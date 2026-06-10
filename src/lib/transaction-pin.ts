import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export function isWeakTransactionPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const weak = new Set(["1234", "4321", "0123", "3210", "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"]);
  return weak.has(pin);
}

export async function hashTransactionPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function getTransactionPinStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      transactionPinHash: true,
      transactionPinLockedUntil: true,
      transactionPinAttempts: true,
    },
  });

  if (!user) {
    return { configured: false, locked: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  const locked = !!user.transactionPinLockedUntil && user.transactionPinLockedUntil > new Date();
  return {
    configured: !!user.transactionPinHash,
    locked,
    lockedUntil: locked ? user.transactionPinLockedUntil!.toISOString() : undefined,
    attemptsRemaining: locked ? 0 : Math.max(0, MAX_ATTEMPTS - user.transactionPinAttempts),
  };
}

type PinFailure = { ok: false; error: string; status: number; code: string };
type PinSuccess = { ok: true };

export async function verifyTransactionPin(userId: string, pin: string): Promise<PinSuccess | PinFailure> {
  if (!pin || !/^\d{4}$/.test(pin)) {
    return { ok: false, error: "Transaction PIN must be 4 digits", status: 400, code: "INVALID_PIN" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      transactionPinHash: true,
      transactionPinAttempts: true,
      transactionPinLockedUntil: true,
    },
  });

  if (!user?.transactionPinHash) {
    return {
      ok: false,
      error: "Set up your 4-digit transaction PIN in Settings before making transactions",
      status: 403,
      code: "PIN_NOT_SET",
    };
  }

  if (user.transactionPinLockedUntil && user.transactionPinLockedUntil > new Date()) {
    const mins = Math.ceil((user.transactionPinLockedUntil.getTime() - Date.now()) / 60_000);
    return {
      ok: false,
      error: `Transaction PIN locked. Try again in ${mins} minute(s).`,
      status: 423,
      code: "PIN_LOCKED",
    };
  }

  const valid = await bcrypt.compare(pin, user.transactionPinHash);
  if (valid) {
    await prisma.user.update({
      where: { id: userId },
      data: { transactionPinAttempts: 0, transactionPinLockedUntil: null },
    });
    return { ok: true };
  }

  const attempts = user.transactionPinAttempts + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      transactionPinAttempts: lockedUntil ? 0 : attempts,
      transactionPinLockedUntil: lockedUntil,
    },
  });

  if (lockedUntil) {
    return {
      ok: false,
      error: "Too many incorrect PIN attempts. Transaction PIN locked for 15 minutes.",
      status: 423,
      code: "PIN_LOCKED",
    };
  }

  const remaining = MAX_ATTEMPTS - attempts;
  return {
    ok: false,
    error: `Incorrect transaction PIN. ${remaining} attempt(s) remaining.`,
    status: 403,
    code: "PIN_INCORRECT",
  };
}

export function pinVerificationResponse(result: PinFailure) {
  return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
}

export async function requireTransactionPin(userId: string, pin: string | undefined) {
  const result = await verifyTransactionPin(userId, pin ?? "");
  if (!result.ok) return pinVerificationResponse(result);
  return null;
}
