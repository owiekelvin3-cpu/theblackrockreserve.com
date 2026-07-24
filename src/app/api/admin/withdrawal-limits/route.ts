import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getPlatformSettings, updatePlatformSettings, SETTING_KEYS, ensureDefaultSettings } from "@/lib/platform-settings";
import { withdrawalLimitsSchema } from "@/lib/validations";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";
import { invalidateAdminCaches } from "@/lib/admin-cache";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    await ensureDefaultSettings();
    const settings = await getPlatformSettings([
      SETTING_KEYS.WITHDRAWAL_SCRIPT_ENABLED,
      SETTING_KEYS.MIN_BANK_WITHDRAWAL_USD,
      SETTING_KEYS.MIN_PROFIT_BALANCE_FOR_WITHDRAW_USD,
      SETTING_KEYS.MIN_PROFIT_WITHDRAWAL_USD,
      SETTING_KEYS.IMF_CLEARANCE_FEE_PERCENTAGE,
    ]);

    return NextResponse.json({
      withdrawalScriptEnabled: settings[SETTING_KEYS.WITHDRAWAL_SCRIPT_ENABLED] !== "false",
      minBankWithdrawalUsd: Number(settings[SETTING_KEYS.MIN_BANK_WITHDRAWAL_USD]) || 0,
      minProfitBalanceForWithdrawUsd:
        Number(settings[SETTING_KEYS.MIN_PROFIT_BALANCE_FOR_WITHDRAW_USD]) || 0,
      minProfitWithdrawalUsd: Number(settings[SETTING_KEYS.MIN_PROFIT_WITHDRAWAL_USD]) || 0,
      imfClearanceFeePercentage: Number(settings[SETTING_KEYS.IMF_CLEARANCE_FEE_PERCENTAGE]) || 0,
    });
  } catch (error) {
    console.error("Withdrawal limits GET error:", error);
    return NextResponse.json({ error: "Failed to load withdrawal limits" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = withdrawalLimitsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (parsed.data.withdrawalScriptEnabled !== undefined) {
      updates[SETTING_KEYS.WITHDRAWAL_SCRIPT_ENABLED] = parsed.data.withdrawalScriptEnabled ? "true" : "false";
    }
    if (parsed.data.minBankWithdrawalUsd !== undefined) {
      updates[SETTING_KEYS.MIN_BANK_WITHDRAWAL_USD] = String(parsed.data.minBankWithdrawalUsd);
    }
    if (parsed.data.minProfitBalanceForWithdrawUsd !== undefined) {
      updates[SETTING_KEYS.MIN_PROFIT_BALANCE_FOR_WITHDRAW_USD] = String(
        parsed.data.minProfitBalanceForWithdrawUsd
      );
    }
    if (parsed.data.minProfitWithdrawalUsd !== undefined) {
      updates[SETTING_KEYS.MIN_PROFIT_WITHDRAWAL_USD] = String(parsed.data.minProfitWithdrawalUsd);
    }
    if (parsed.data.imfClearanceFeePercentage !== undefined) {
      updates[SETTING_KEYS.IMF_CLEARANCE_FEE_PERCENTAGE] = String(parsed.data.imfClearanceFeePercentage);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    await updatePlatformSettings(updates, session.user.id);

    await logAdminAction(
      session.user.id,
      "WITHDRAWAL_LIMITS_UPDATED",
      updates,
      undefined,
      getClientIp(req)
    );

    invalidateAdminCaches();

    return NextResponse.json({ success: true, message: "Withdrawal limits updated." });
  } catch (error) {
    console.error("Withdrawal limits PATCH error:", error);
    return NextResponse.json({ error: "Failed to update withdrawal limits" }, { status: 500 });
  }
}
