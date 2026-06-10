"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-accent-brand uppercase tracking-wider">{t("errors.errorCode")}</p>
      <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">{t("errors.errorTitle")}</h1>
      <p className="mt-3 text-text-secondary max-w-md">{t("errors.errorDesc")}</p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button onClick={reset}>{t("errors.tryAgain")}</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          {t("errors.backHome")}
        </Button>
      </div>
    </div>
  );
}
