"use client";

import Skeleton from "@/components/ui/Skeleton";
import { useI18n } from "@/components/providers/I18nProvider";

interface AdminFetchStateProps {
  loading: boolean;
  error: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry: () => void;
  lastUpdated?: Date | null;
  children: React.ReactNode;
}

export default function AdminFetchState({
  loading,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
  lastUpdated,
  children,
}: AdminFetchStateProps) {
  const { t } = useI18n();
  const empty = emptyMessage ?? t("adminFetch.emptyDefault");

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="text-white font-medium">{t("adminFetch.loadFailed")}</p>
        <p className="text-sm text-[var(--admin-muted)] mt-2">{error}</p>
        <button type="button" onClick={onRetry} className="admin-btn-primary mt-4 px-6 py-2 text-sm">
          {t("adminFetch.retry")}
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="admin-card p-12 text-center text-[var(--admin-muted)]">{empty}</div>
    );
  }

  return (
    <>
      {lastUpdated && (
        <p className="text-[10px] text-[var(--admin-muted)] mb-4 text-right">
          {t("adminFetch.liveSync", { time: lastUpdated.toLocaleTimeString() })}
        </p>
      )}
      {children}
    </>
  );
}
