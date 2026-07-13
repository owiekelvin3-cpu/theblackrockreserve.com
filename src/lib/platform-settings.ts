import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const SETTING_KEYS = {
  BITCOIN_WALLET_ADDRESS: "bitcoin_wallet_address",
  BITCOIN_PURCHASE_LINK: "bitcoin_purchase_link",
  DEPOSIT_INSTRUCTIONS: "deposit_instructions",
  DEPOSIT_CONFIRMATION_MESSAGE: "deposit_confirmation_message",
  JOINT_APPROVAL_THRESHOLD: "joint_approval_threshold",
  CONTACT_EMAIL: "contact_email",
  CONTACT_PHONE: "contact_phone",
  CONTACT_ADDRESS_LINE1: "contact_address_line1",
  CONTACT_ADDRESS_LINE2: "contact_address_line2",
  CONTACT_HQ_TITLE: "contact_hq_title",
  CONTACT_HQ_ADDRESS: "contact_hq_address",
  CONTACT_FAQS: "contact_faqs",
  PHYSICAL_CARD_ORDERS_ENABLED: "physical_card_orders_enabled",
  PHYSICAL_CARD_REQUIRE_KYC: "physical_card_require_kyc",
  PHYSICAL_CARD_REQUIRE_INVESTMENT: "physical_card_require_investment",
  PHYSICAL_CARD_MIN_BALANCE: "physical_card_min_balance",
  PHYSICAL_CARD_REQUIRE_PHONE: "physical_card_require_phone",
  PHYSICAL_CARD_REQUIRE_EMAIL: "physical_card_require_email",
  HIGH_YIELD_SAVINGS_APY: "high_yield_savings_apy",
  WITHDRAWAL_CHARGE_ENABLED: "withdrawal_charge_enabled",
  WITHDRAWAL_CHARGE_TYPE: "withdrawal_charge_type",
  WITHDRAWAL_CHARGE_PERCENTAGE: "withdrawal_charge_percentage",
  WITHDRAWAL_CHARGE_AMOUNT_USD: "withdrawal_charge_amount_usd",
} as const;

export type ContactFaq = { question: string; answer: string };

export const DEFAULT_CONTACT_FAQS: ContactFaq[] = [
  {
    question: "How do I open an account?",
    answer:
      "Click 'Open Account' and complete our 3-step registration process. You'll need a valid government ID for KYC verification.",
  },
  {
    question: "What are the fees?",
    answer:
      "Standard banking and investment accounts have no monthly subscription fee. Investment products may carry fund-level expenses disclosed before you invest.",
  },
  {
    question: "Is my money insured?",
    answer: "Yes. Deposits are FDIC insured up to $250,000 per depositor, per account category.",
  },
  {
    question: "How long do transfers take?",
    answer:
      "Domestic transfers are instant. International transfers typically arrive within 1-3 business days depending on the destination.",
  },
  {
    question: "Can I invest in cryptocurrency?",
    answer:
      "Yes. Explore curated crypto index funds and digital asset products through the Investments and Capital Markets sections of your dashboard.",
  },
];

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<SettingKey, string> = {
  [SETTING_KEYS.BITCOIN_WALLET_ADDRESS]: "",
  [SETTING_KEYS.BITCOIN_PURCHASE_LINK]: "",
  [SETTING_KEYS.DEPOSIT_INSTRUCTIONS]:
    "Send Bitcoin to the wallet address below. After sending, submit your transaction hash as proof of payment. Deposits are credited after admin verification.",
  [SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE]:
    "Your deposit proof has been submitted. We will verify your payment and credit your account shortly.",
  [SETTING_KEYS.JOINT_APPROVAL_THRESHOLD]: "5000",
  [SETTING_KEYS.CONTACT_EMAIL]: "blackrockreservesupport@gmail.com",
  [SETTING_KEYS.CONTACT_PHONE]: "+1 (800) 555-0199",
  [SETTING_KEYS.CONTACT_ADDRESS_LINE1]: "1 Blackrock Plaza, Suite 400",
  [SETTING_KEYS.CONTACT_ADDRESS_LINE2]: "New York, NY 10004",
  [SETTING_KEYS.CONTACT_HQ_TITLE]: "New York Headquarters",
  [SETTING_KEYS.CONTACT_HQ_ADDRESS]: "1 Blackrock Plaza, Suite 400 · New York, NY 10004",
  [SETTING_KEYS.CONTACT_FAQS]: JSON.stringify(DEFAULT_CONTACT_FAQS),
  [SETTING_KEYS.PHYSICAL_CARD_ORDERS_ENABLED]: "true",
  [SETTING_KEYS.PHYSICAL_CARD_REQUIRE_KYC]: "true",
  [SETTING_KEYS.PHYSICAL_CARD_REQUIRE_INVESTMENT]: "false",
  [SETTING_KEYS.PHYSICAL_CARD_MIN_BALANCE]: "500",
  [SETTING_KEYS.PHYSICAL_CARD_REQUIRE_PHONE]: "true",
  [SETTING_KEYS.PHYSICAL_CARD_REQUIRE_EMAIL]: "true",
  [SETTING_KEYS.HIGH_YIELD_SAVINGS_APY]: "20",
  [SETTING_KEYS.WITHDRAWAL_CHARGE_ENABLED]: "true",
  [SETTING_KEYS.WITHDRAWAL_CHARGE_TYPE]: "PERCENTAGE",
  [SETTING_KEYS.WITHDRAWAL_CHARGE_PERCENTAGE]: "15",
  [SETTING_KEYS.WITHDRAWAL_CHARGE_AMOUNT_USD]: "0",
};

const CACHE_TAG = "platform-settings";

export async function ensureDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
}

function mergeSettings(rows: { key: string; value: string }[], keys?: SettingKey[]) {
  const map = { ...DEFAULTS };
  for (const s of rows) {
    if (!keys || keys.includes(s.key as SettingKey)) {
      map[s.key as SettingKey] = s.value;
    }
  }
  map[SETTING_KEYS.BITCOIN_WALLET_ADDRESS] = map[SETTING_KEYS.BITCOIN_WALLET_ADDRESS].trim();
  map[SETTING_KEYS.BITCOIN_PURCHASE_LINK] = map[SETTING_KEYS.BITCOIN_PURCHASE_LINK].trim();
  map[SETTING_KEYS.CONTACT_EMAIL] = map[SETTING_KEYS.CONTACT_EMAIL].trim();
  map[SETTING_KEYS.CONTACT_PHONE] = map[SETTING_KEYS.CONTACT_PHONE].trim();
  return map;
}

export function parseContactFaqs(raw: string): ContactFaq[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_CONTACT_FAQS;
    const faqs = parsed
      .filter((item): item is ContactFaq => {
        if (!item || typeof item !== "object") return false;
        const row = item as Record<string, unknown>;
        return typeof row.question === "string" && typeof row.answer === "string";
      })
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);
    return faqs.length > 0 ? faqs : DEFAULT_CONTACT_FAQS;
  } catch {
    return DEFAULT_CONTACT_FAQS;
  }
}

export function serializeContactSettings(settings: Record<SettingKey, string>) {
  return {
    contactEmail: settings[SETTING_KEYS.CONTACT_EMAIL],
    contactPhone: settings[SETTING_KEYS.CONTACT_PHONE],
    contactAddressLine1: settings[SETTING_KEYS.CONTACT_ADDRESS_LINE1],
    contactAddressLine2: settings[SETTING_KEYS.CONTACT_ADDRESS_LINE2],
    contactHqTitle: settings[SETTING_KEYS.CONTACT_HQ_TITLE],
    contactHqAddress: settings[SETTING_KEYS.CONTACT_HQ_ADDRESS],
    contactFaqs: parseContactFaqs(settings[SETTING_KEYS.CONTACT_FAQS]),
  };
}

async function readPlatformSettings(keys?: SettingKey[]) {
  const all = await prisma.platformSetting.findMany({
    where: keys ? { key: { in: keys } } : undefined,
  });
  return mergeSettings(all, keys);
}

export async function getPlatformSettings(keys?: SettingKey[]) {
  return readPlatformSettings(keys);
}

export async function getPlatformSettingsCached(keys?: SettingKey[]) {
  if (keys) return readPlatformSettings(keys);
  return unstable_cache(() => readPlatformSettings(), ["platform-settings-all"], {
    revalidate: 60,
    tags: [CACHE_TAG],
  })();
}

export const getPublicContactSettings = unstable_cache(
  async () => {
    const settings = await readPlatformSettings([
      SETTING_KEYS.CONTACT_EMAIL,
      SETTING_KEYS.CONTACT_PHONE,
      SETTING_KEYS.CONTACT_ADDRESS_LINE1,
      SETTING_KEYS.CONTACT_ADDRESS_LINE2,
      SETTING_KEYS.CONTACT_HQ_TITLE,
      SETTING_KEYS.CONTACT_HQ_ADDRESS,
      SETTING_KEYS.CONTACT_FAQS,
    ]);
    return serializeContactSettings(settings);
  },
  ["public-contact-settings"],
  { revalidate: 30, tags: [CACHE_TAG] }
);

export const getPublicDepositSettings = unstable_cache(
  async () => {
    const settings = await readPlatformSettings([
      SETTING_KEYS.BITCOIN_WALLET_ADDRESS,
      SETTING_KEYS.BITCOIN_PURCHASE_LINK,
      SETTING_KEYS.DEPOSIT_INSTRUCTIONS,
      SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE,
    ]);
    return {
      bitcoinWalletAddress: settings[SETTING_KEYS.BITCOIN_WALLET_ADDRESS],
      bitcoinPurchaseLink: settings[SETTING_KEYS.BITCOIN_PURCHASE_LINK],
      depositInstructions: settings[SETTING_KEYS.DEPOSIT_INSTRUCTIONS],
      depositConfirmationMessage: settings[SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE],
    };
  },
  ["public-deposit-settings"],
  { revalidate: 30, tags: [CACHE_TAG] }
);

export function invalidatePlatformSettingsCache() {
  revalidateTag(CACHE_TAG);
}

export async function updatePlatformSettings(
  updates: Partial<Record<SettingKey, string>>,
  adminId: string
) {
  const results = await Promise.all(
    Object.entries(updates).map(([key, value]) => {
      if (value === undefined) return null;
      const normalized =
        key === SETTING_KEYS.BITCOIN_WALLET_ADDRESS || key === SETTING_KEYS.BITCOIN_PURCHASE_LINK
          ? value.trim()
          : value;
      return prisma.platformSetting.upsert({
        where: { key },
        create: { key, value: normalized, updatedBy: adminId },
        update: { value: normalized, updatedBy: adminId },
      });
    })
  );

  invalidatePlatformSettingsCache();
  return results.filter(Boolean);
}
