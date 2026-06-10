"use client";

import { useI18n } from "@/components/providers/I18nProvider";

export default function AuthCopyright() {
  const { t } = useI18n();
  return (
    <p className="relative z-10 mt-8 text-xs text-text-muted">
      {t("auth.layoutCopyright", { year: new Date().getFullYear() })}
    </p>
  );
}
