import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const SETTING_KEYS = {
  BITCOIN_WALLET_ADDRESS: "bitcoin_wallet_address",
  BITCOIN_PURCHASE_LINK: "bitcoin_purchase_link",
  DEPOSIT_INSTRUCTIONS: "deposit_instructions",
  DEPOSIT_CONFIRMATION_MESSAGE: "deposit_confirmation_message",
  JOINT_APPROVAL_THRESHOLD: "joint_approval_threshold",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const DEFAULTS: Record<SettingKey, string> = {
  [SETTING_KEYS.BITCOIN_WALLET_ADDRESS]: "",
  [SETTING_KEYS.BITCOIN_PURCHASE_LINK]: "",
  [SETTING_KEYS.DEPOSIT_INSTRUCTIONS]:
    "Send Bitcoin to the wallet address below. After sending, submit your transaction hash as proof of payment. Deposits are credited after admin verification.",
  [SETTING_KEYS.DEPOSIT_CONFIRMATION_MESSAGE]:
    "Your deposit proof has been submitted. We will verify your payment and credit your account shortly.",
  [SETTING_KEYS.JOINT_APPROVAL_THRESHOLD]: "5000",
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
  return map;
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
