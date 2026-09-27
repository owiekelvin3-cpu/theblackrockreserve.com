import type { KycStatus } from "@prisma/client";

export const KYC_ID_TYPES = ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"] as const;
export type KycIdType = (typeof KYC_ID_TYPES)[number];

export function isKycBlockingAccess(user: {
  kycRequired?: boolean | null;
  kycStatus?: string | null;
}) {
  return Boolean(user.kycRequired) && user.kycStatus !== "VERIFIED";
}

export function canSubmitKyc(status: KycStatus | string | null | undefined) {
  return status === "PENDING" || status === "REJECTED";
}
