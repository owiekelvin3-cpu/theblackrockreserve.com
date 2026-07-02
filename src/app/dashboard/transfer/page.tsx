"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import MemberTransferPanel from "@/components/dashboard/MemberTransferPanel";
import NameTransferPanel from "@/components/dashboard/NameTransferPanel";
import MemberTransferReceiptModal, {
  type MemberTransferReceiptData,
} from "@/components/dashboard/MemberTransferReceiptModal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

type TransferAccount = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  availableBalance: number;
};

type TransferMode = "account" | "name";

export default function TransferPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<TransferAccount[]>([]);
  const [canTransferByName, setCanTransferByName] = useState(false);
  const [transferMode, setTransferMode] = useState<TransferMode>("account");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<MemberTransferReceiptData | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    fetchDashboardJson<{ accounts: TransferAccount[]; canTransferByName?: boolean }>(
      "/api/dashboard/transfers"
    )
      .then(({ data, error }) => {
        if (error || !data) {
          if (!silent) setLoadError(true);
          return;
        }
        setAccounts(data.accounts ?? []);
        setCanTransferByName(Boolean(data.canTransferByName));
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleTransferComplete = useCallback(
    (receipt: MemberTransferReceiptData) => {
      setReceiptData(receipt);
      setReceiptOpen(true);
      load(true);
    },
    [load]
  );

  const accountOptions = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    availableBalance: a.availableBalance,
  }));

  return (
    <>
      <DashboardGate isLoading={loading}>
        <div className="space-y-6 max-w-2xl">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary mb-3 transition-colors"
            >
              <ArrowLeft size={14} />
              {t("nav.dashboard")}
            </Link>
            <h1 className="text-2xl font-bold text-text-primary">
              {t("transfer.title")}{" "}
              <span className="gold-gradient-text">{t("transfer.titleHighlight")}</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1">{t("transfer.subtitle")}</p>
          </div>

          {loadError && (
            <Card className="border border-accent-red/30 bg-accent-red/5">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-accent-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-text-primary font-medium">{t("transfer.loadError")}</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => load()}>
                    {t("transfer.retry")}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!loadError && accounts.length === 0 && !loading && (
            <Card>
              <p className="text-sm font-medium text-text-primary">{t("transfer.noAccount")}</p>
              <p className="text-xs text-text-muted mt-1">{t("transfer.noAccountDesc")}</p>
            </Card>
          )}

          {accounts.length > 0 && canTransferByName && (
            <div
              className="flex flex-wrap gap-2 p-1 rounded-xl border border-white/10 bg-white/5"
              role="tablist"
              aria-label={t("transfer.methodTabs")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={transferMode === "account"}
                onClick={() => setTransferMode("account")}
                className={cn(
                  "flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  transferMode === "account"
                    ? "bg-accent-brand/20 text-white border border-accent-brand/40"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {t("transfer.byAccountNumber")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={transferMode === "name"}
                onClick={() => setTransferMode("name")}
                className={cn(
                  "flex-1 min-w-[140px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  transferMode === "name"
                    ? "bg-accent-gold/20 text-white border border-accent-gold/40"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {t("transfer.byName")}
              </button>
            </div>
          )}

          {accounts.length > 0 && (!canTransferByName || transferMode === "account") && (
            <MemberTransferPanel
              accounts={accountOptions}
              onTransferComplete={handleTransferComplete}
            />
          )}

          {accounts.length > 0 && canTransferByName && transferMode === "name" && (
            <NameTransferPanel accounts={accountOptions} onTransferComplete={handleTransferComplete} />
          )}
        </div>
      </DashboardGate>

      <MemberTransferReceiptModal
        open={receiptOpen}
        receipt={receiptData}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptData(null);
        }}
      />
    </>
  );
}
