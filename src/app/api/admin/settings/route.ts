import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import {
  getPlatformSettings,
  updatePlatformSettings,
  SETTING_KEYS,
  ensureDefaultSettings,
  serializeContactSettings,
} from "@/lib/platform-settings";
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
      ...serializeContactSettings(settings),
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
    if (parsed.data.contactEmail !== undefined) {
      updates[SETTING_KEYS.CONTACT_EMAIL] = parsed.data.contactEmail.trim();
    }
    if (parsed.data.contactPhone !== undefined) {
      updates[SETTING_KEYS.CONTACT_PHONE] = parsed.data.contactPhone.trim();
    }
    if (parsed.data.contactAddressLine1 !== undefined) {
      updates[SETTING_KEYS.CONTACT_ADDRESS_LINE1] = parsed.data.contactAddressLine1.trim();
    }
    if (parsed.data.contactAddressLine2 !== undefined) {
      updates[SETTING_KEYS.CONTACT_ADDRESS_LINE2] = parsed.data.contactAddressLine2.trim();
    }
    if (parsed.data.contactHqTitle !== undefined) {
      updates[SETTING_KEYS.CONTACT_HQ_TITLE] = parsed.data.contactHqTitle.trim();
    }
    if (parsed.data.contactHqAddress !== undefined) {
      updates[SETTING_KEYS.CONTACT_HQ_ADDRESS] = parsed.data.contactHqAddress.trim();
    }
    if (parsed.data.contactFaqs !== undefined) {
      const faqs = parsed.data.contactFaqs
        .map((faq) => ({
          question: faq.question.trim(),
          answer: faq.answer.trim(),
        }))
        .filter((faq) => faq.question && faq.answer);
      updates[SETTING_KEYS.CONTACT_FAQS] = JSON.stringify(faqs);
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
      ...serializeContactSettings(settings),
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
