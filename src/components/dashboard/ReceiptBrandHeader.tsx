"use client";

import AppIconMark from "@/components/ui/AppIconMark";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

type ReceiptBrandHeaderProps = {
  className?: string;
  iconSize?: number;
};

export default function ReceiptBrandHeader({ className, iconSize = 32 }: ReceiptBrandHeaderProps) {
  const { t } = useI18n();

  return (
    <div className={cn("tx-receipt-brand-header", className)}>
      <div className="tx-receipt-brand-lockup">
        <AppIconMark size={iconSize} className="rounded-lg" />
        <span className="tx-receipt-brand-wordmark">{t("brand.name")}</span>
      </div>
    </div>
  );
}
