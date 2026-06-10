import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUserId, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  changeTransactionPinSchema,
  setTransactionPinSchema,
} from "@/lib/validations";
import {
  getTransactionPinStatus,
  hashTransactionPin,
  isWeakTransactionPin,
  verifyTransactionPin,
} from "@/lib/transaction-pin";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const status = await getTransactionPinStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Transaction PIN status error:", error);
    return NextResponse.json({ error: "Failed to load PIN status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = setTransactionPinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, transactionPinHash: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.transactionPinHash) {
      return NextResponse.json({ error: "Transaction PIN is already set. Use change PIN instead." }, { status: 400 });
    }

    const passwordValid = await bcrypt.compare(parsed.data.password, user.password);
    if (!passwordValid) {
      return NextResponse.json({ error: "Incorrect login password" }, { status: 403 });
    }

    if (isWeakTransactionPin(parsed.data.pin)) {
      return NextResponse.json(
        { error: "Choose a stronger PIN. Avoid repeated or sequential digits." },
        { status: 400 }
      );
    }

    const hash = await hashTransactionPin(parsed.data.pin);
    await prisma.user.update({
      where: { id: userId },
      data: {
        transactionPinHash: hash,
        transactionPinSetAt: new Date(),
        transactionPinAttempts: 0,
        transactionPinLockedUntil: null,
      },
    });

    return NextResponse.json({ success: true, configured: true });
  } catch (error) {
    console.error("Transaction PIN setup error:", error);
    return NextResponse.json({ error: "Failed to set transaction PIN" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = changeTransactionPinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const current = await verifyTransactionPin(userId, parsed.data.currentPin);
    if (!current.ok) {
      return NextResponse.json({ error: current.error, code: current.code }, { status: current.status });
    }

    if (isWeakTransactionPin(parsed.data.newPin)) {
      return NextResponse.json(
        { error: "Choose a stronger PIN. Avoid repeated or sequential digits." },
        { status: 400 }
      );
    }

    const hash = await hashTransactionPin(parsed.data.newPin);
    await prisma.user.update({
      where: { id: userId },
      data: {
        transactionPinHash: hash,
        transactionPinSetAt: new Date(),
        transactionPinAttempts: 0,
        transactionPinLockedUntil: null,
      },
    });

    return NextResponse.json({ success: true, configured: true });
  } catch (error) {
    console.error("Transaction PIN change error:", error);
    return NextResponse.json({ error: "Failed to change transaction PIN" }, { status: 500 });
  }
}
