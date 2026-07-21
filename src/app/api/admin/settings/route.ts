import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, forbiddenResponse } from "@/lib/api-auth";
import {
  getPlatformSettings,
  updatePlatformSettings,
  SETTING_KEYS,
  ensureDefaultSettings,
  serializeContactSettings,
} from "@/lib/platform-settings";
import { getPhysicalCardRequirements } from "@/lib/physical-cards";
import { platformSettingsSchema } from "@/lib/validations";
import { logAdminAction, getClientIp } from "@/lib/admin-audit";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return forbiddenResponse();

  try {
    await ensureDefaultSettings();
    const settings = await getPlatformSettings();
    const physicalCardRequirements = await getPhysicalCardRequirements();
    return NextResponse.json({
      bitcoinWalletAddress: settings[SETTING_KEYS.BITCOIN_WALLET_ADDRESS],
      bitcoinPurchaseLink: settings[SETTING_KEYS.BITCOIN_PURCHASE_LINK],
      depositInstructions: settings[SETTING_KEYS.DEPOSIT_INSTRUCTIONS],
      depositConfirmationMessage: settings[SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE],
      withdrawalChargeOverviewMessage: settings[SETTING_KEYS.WITHDRAWAL_CHARGE_OVERVIEW_MESSAGE],
      physicalCardOrdersEnabled: physicalCardRequirements.ordersEnabled,
      physicalCardRequireKyc: physicalCardRequirements.requireKyc,
      physicalCardRequireInvestment: physicalCardRequirements.requireInvestment,
      physicalCardMinBalance: physicalCardRequirements.minAccountBalance,
      physicalCardRequirePhone: physicalCardRequirements.requirePhone,
      physicalCardRequireEmail: physicalCardRequirements.requireEmailVerified,
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
    if (parsed.data.withdrawalChargeOverviewMessage !== undefined) {
      updates[SETTING_KEYS.WITHDRAWAL_CHARGE_OVERVIEW_MESSAGE] = parsed.data.withdrawalChargeOverviewMessage;
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
    if (parsed.data.physicalCardOrdersEnabled !== undefined) {
      updates[SETTING_KEYS.PHYSICAL_CARD_ORDERS_ENABLED] = String(parsed.data.physicalCardOrdersEnabled);
    }
    if (parsed.data.physicalCardRequireKyc !== undefined) {
      updates[SETTING_KEYS.PHYSICAL_CARD_REQUIRE_KYC] = String(parsed.data.physicalCardRequireKyc);
    }
    if (parsed.data.physicalCardRequireInvestment !== undefined) {
      updates[SETTING_KEYS.PHYSICAL_CARD_REQUIRE_INVESTMENT] = String(parsed.data.physicalCardRequireInvestment);
    }
    if (parsed.data.physicalCardMinBalance !== undefined) {
      updates[SETTING_KEYS.PHYSICAL_CARD_MIN_BALANCE] = String(parsed.data.physicalCardMinBalance);
    }
    if (parsed.data.physicalCardRequirePhone !== undefined) {
      updates[SETTING_KEYS.PHYSICAL_CARD_REQUIRE_PHONE] = String(parsed.data.physicalCardRequirePhone);
    }
    if (parsed.data.physicalCardRequireEmail !== undefined) {
      updates[SETTING_KEYS.PHYSICAL_CARD_REQUIRE_EMAIL] = String(parsed.data.physicalCardRequireEmail);
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
    const physicalCardRequirements = await getPhysicalCardRequirements();
    return NextResponse.json({
      bitcoinWalletAddress: settings[SETTING_KEYS.BITCOIN_WALLET_ADDRESS],
      bitcoinPurchaseLink: settings[SETTING_KEYS.BITCOIN_PURCHASE_LINK],
      depositInstructions: settings[SETTING_KEYS.DEPOSIT_INSTRUCTIONS],
      depositConfirmationMessage: settings[SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE],
      withdrawalChargeOverviewMessage: settings[SETTING_KEYS.WITHDRAWAL_CHARGE_OVERVIEW_MESSAGE],
      physicalCardOrdersEnabled: physicalCardRequirements.ordersEnabled,
      physicalCardRequireKyc: physicalCardRequirements.requireKyc,
      physicalCardRequireInvestment: physicalCardRequirements.requireInvestment,
      physicalCardMinBalance: physicalCardRequirements.minAccountBalance,
      physicalCardRequirePhone: physicalCardRequirements.requirePhone,
      physicalCardRequireEmail: physicalCardRequirements.requireEmailVerified,
      ...serializeContactSettings(settings),
    });
  } catch (error) {
    console.error("Settings PATCH error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
