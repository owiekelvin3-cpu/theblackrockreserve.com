"use client";

import Link from "next/link";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-accent-brand uppercase tracking-wider">{t("errors.notFoundCode")}</p>
      <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-white">{t("errors.notFoundTitle")}</h1>
      <p className="mt-3 text-text-secondary max-w-md">{t("errors.notFoundDesc")}</p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <Button>{t("errors.backHome")}</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">{t("errors.signIn")}</Button>
        </Link>
      </div>
    </div>
  );
}
