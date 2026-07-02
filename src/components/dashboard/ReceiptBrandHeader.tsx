"use client";

import AppIconMark from "@/components/ui/AppIconMark";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

type ReceiptBrandHeaderProps = {
  className?: string;
};

export default function ReceiptBrandHeader({ className }: ReceiptBrandHeaderProps) {
  const { t } = useI18n();

  return (
    <div className={cn("tx-receipt-brand-header", className)}>
      <div className="tx-receipt-brand-lockup">
        <AppIconMark size={24} className="rounded-lg" />
        <span className="tx-receipt-brand-wordmark">{t("brand.name")}</span>
      </div>
    </div>
  );
}
