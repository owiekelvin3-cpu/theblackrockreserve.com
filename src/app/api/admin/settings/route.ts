import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import { getPlatformSettings, updatePlatformSettings, SETTING_KEYS, ensureDefaultSettings } from "@/lib/platform-settings";
import { platformSettingsSchema } from "@/lib/validations";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    await ensureDefaultSettings();
    const settings = await getPlatformSettings();
    return NextResponse.json({
      bitcoinWalletAddress: settings[SETTING_KEYS.BITCOIN_WALLET_ADDRESS],
      bitcoinPurchaseLink: settings[SETTING_KEYS.BITCOIN_PURCHASE_LINK],
      depositInstructions: settings[SETTING_KEYS.DEPOSIT_INSTRUCTIONS],
      depositConfirmationMessage: settings[SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE],
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    const body = await req.json();
    const parsed = platformSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (parsed.data.bitcoinWalletAddress !== undefined) {
      updates[SETTING_KEYS.BITCOIN_WALLET_ADDRESS] = parsed.data.bitcoinWalletAddress.trim();
    }
    if (parsed.data.bitcoinPurchaseLink !== undefined) {
      updates[SETTING_KEYS.BITCOIN_PURCHASE_LINK] = parsed.data.bitcoinPurchaseLink.trim();
    }
    if (parsed.data.depositInstructions !== undefined) {
      updates[SETTING_KEYS.DEPOSIT_INSTRUCTIONS] = parsed.data.depositInstructions;
    }
    if (parsed.data.depositConfirmationMessage !== undefined) {
      updates[SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE] = parsed.data.depositConfirmationMessage;
    }

    await updatePlatformSettings(updates, session.user.id);

    await logAdminAction(
      session.user.id,
      "SETTINGS_UPDATE",
      { updates: parsed.data },
      undefined,
      getClientIp(req)
    );

    const settings = await getPlatformSettings();
    return NextResponse.json({
      bitcoinWalletAddress: settings[SETTING_KEYS.BITCOIN_WALLET_ADDRESS],
      bitcoinPurchaseLink: settings[SETTING_KEYS.BITCOIN_PURCHASE_LINK],
      depositInstructions: settings[SETTING_KEYS.DEPOSIT_INSTRUCTIONS],
      depositConfirmationMessage: settings[SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE],
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
