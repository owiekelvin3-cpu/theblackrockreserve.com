"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Copy, Check, Download, Loader2, Wallet, ArrowDownLeft, ArrowUpRight,
  RefreshCw, Receipt, TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  buildReceiptDownloadText,
  downloadTextFile,
  transactionTypeLabel,
} from "@/lib/transaction-receipt";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TransactionDetail = {
  id: string;
  referenceId: string;
  name: string;
  description: string;
  type: string;
  category: string;
  amount: number;
  status: string;
  statusLabel: string;
  date: string;
  account: {
    id: string;
    name: string;
    currency: string;
    maskedNumber: string;
  };
};

const TYPE_ICONS: Record<string, typeof Wallet> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: ArrowUpRight,
  TRANSFER: RefreshCw,
  PAYMENT: Receipt,
  INVESTMENT: TrendingUp,
  SALE: ArrowUpRight,
  PROFIT_CREDIT: ArrowDownLeft,
  PROFIT_DEBIT: ArrowUpRight,
};

type TransactionDetailModalProps = {
  transactionId: string | null;
  onClose: () => void;
};

export default function TransactionDetailModal({
  transactionId,
  onClose,
}: TransactionDetailModalProps) {
  const { t, formatCurrency, formatDate, formatTime } = useI18n();
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const open = !!transactionId;

  useEffect(() => {
    if (!transactionId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/dashboard/activities/${transactionId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed");
        if (!cancelled) setDetail(json);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(t("dashboard.transactionDetail.loadError"));
          onClose();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [transactionId, onClose, t]);

  const handleCopy = async () => {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.id);
      setCopied(true);
      toast.success(t("withdrawals.receipt.copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDownload = () => {
    if (!detail) return;
    const dateTime = `${formatDate(detail.date)} · ${formatTime(detail.date)}`;
    const text = buildReceiptDownloadText({
      title: t("dashboard.transactionDetail.title"),
      referenceId: detail.referenceId,
      status: detail.statusLabel,
      amount: formatCurrency(Math.abs(detail.amount)),
      paymentMethod: transactionTypeLabel(detail.type),
      destination: `${detail.account.name} (${detail.account.maskedNumber})`,
      dateTime,
      confirmationMessage: detail.description,
      brandName: t("brand.name"),
    });
    downloadTextFile(`transaction-${detail.id.slice(-8)}.txt`, text);
    toast.success(t("withdrawals.receipt.downloaded"));
  };

  const statusKey = detail?.status.toLowerCase() ?? "";
  const Icon = detail ? TYPE_ICONS[detail.type] ?? Wallet : Wallet;

  return (
    <AnimatePresence>
      {open && (
        <div className="tx-receipt-backdrop">
          <motion.button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="transaction-detail-title"
            className="tx-receipt-modal tx-detail-modal"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tx-receipt-header">
              <div className="tx-detail-type-icon" aria-hidden>
                {loading ? (
                  <Loader2 size={22} className="animate-spin text-accent-brand" />
                ) : (
                  <Icon size={22} className="text-accent-brand" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="tx-receipt-eyebrow">{t("brand.name")}</p>
                <h2 id="transaction-detail-title" className="tx-receipt-title">
                  {t("dashboard.transactionDetail.title")}
                </h2>
                <p className="tx-receipt-subtitle">{t("dashboard.transactionDetail.subtitle")}</p>
              </div>
              <button type="button" onClick={onClose} className="tx-receipt-close" aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>

            {loading || !detail ? (
              <div className="tx-detail-loading">
                <Loader2 size={24} className="animate-spin text-accent-brand" />
              </div>
            ) : (
              <>
                <div className="tx-receipt-status-banner">
                  <span
                    className={cn(
                      "tx-receipt-status-dot",
                      statusKey === "completed" && "tx-receipt-status-dot-success",
                      statusKey === "failed" && "tx-receipt-status-dot-failed"
                    )}
                    aria-hidden
                  />
                  <div>
                    <p className="tx-receipt-status-label">{transactionTypeLabel(detail.type)}</p>
                    <p className="tx-receipt-status-hint">{detail.statusLabel}</p>
                  </div>
                </div>

                <div className="tx-receipt-amount-block">
                  <p className="tx-receipt-amount-label">{t("dashboard.transactionDetail.amount")}</p>
                  <p
                    className={cn(
                      "tx-receipt-amount",
                      detail.amount >= 0 ? "text-accent-green" : "text-text-primary"
                    )}
                  >
                    {detail.amount >= 0 ? "+" : ""}
                    {formatCurrency(detail.amount)}
                  </p>
                </div>

                <div className="tx-receipt-grid">
                  <ReceiptRow label={t("dashboard.transactionDetail.reference")} value={detail.referenceId} mono />
                  <ReceiptRow
                    label={t("dashboard.transactionDetail.dateTime")}
                    value={`${formatDate(detail.date)} · ${formatTime(detail.date)}`}
                  />
                  <ReceiptRow label={t("dashboard.transactionDetail.type")} value={transactionTypeLabel(detail.type)} />
                  <ReceiptRow label={t("dashboard.transactionDetail.status")} value={detail.statusLabel} />
                  <ReceiptRow
                    label={t("dashboard.transactionDetail.account")}
                    value={`${detail.account.name} · ${detail.account.currency}`}
                  />
                  <ReceiptRow
                    label={t("dashboard.transactionDetail.accountNumber")}
                    value={detail.account.maskedNumber}
                    mono
                  />
                  <ReceiptRow label={t("dashboard.transactionDetail.description")} value={detail.description} full />
                </div>

                <div className="tx-receipt-actions">
                  <Button type="button" variant="outline" className="flex-1 min-h-[44px]" onClick={handleDownload}>
                    <Download size={16} />
                    {t("withdrawals.receipt.download")}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 min-h-[44px]" onClick={handleCopy}>
                    {copied ? <Check size={16} className="text-accent-green" /> : <Copy size={16} />}
                    {t("withdrawals.receipt.copyId")}
                  </Button>
                </div>

                <Button type="button" className="w-full min-h-[44px] mt-4" onClick={onClose}>
                  {t("withdrawals.receipt.close")}
                </Button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ReceiptRow({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "tx-receipt-row tx-receipt-row-full" : "tx-receipt-row"}>
      <span className="tx-receipt-row-label">{label}</span>
      <span className={mono ? "tx-receipt-row-value tx-receipt-mono" : "tx-receipt-row-value"}>{value}</span>
    </div>
  );
}
