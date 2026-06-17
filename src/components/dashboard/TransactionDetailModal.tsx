"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Copy, Check, Download, Loader2, Wallet, ArrowDownLeft, ArrowUpRight,
  RefreshCw, Receipt, TrendingUp,
} from "lucide-react";
import Button from "@/components/ui/Button";
import UserDisplayName from "@/components/ui/UserDisplayName";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  transactionTypeLabel,
} from "@/lib/transaction-receipt";
import { downloadReceiptAsImage } from "@/lib/receipt-image";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { VerificationBadgeType } from "@/lib/verification-badge";

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
  counterpartyName?: string | null;
  counterpartyVerificationBadge?: VerificationBadgeType | string | null;
  counterpartyRelation?: "sender" | "recipient" | null;
  ownerName?: string | null;
  ownerVerificationBadge?: VerificationBadgeType | string | null;
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
  const [downloading, setDownloading] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

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

  const handleDownload = async () => {
    if (!detail || !captureRef.current) return;
    setDownloading(true);
    try {
      await downloadReceiptAsImage(
        captureRef.current,
        `transaction-${detail.id.slice(-8)}.png`
      );
      toast.success(t("withdrawals.receipt.downloaded"));
    } catch {
      toast.error(t("withdrawals.receipt.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const statusKey = detail?.status.toLowerCase() ?? "";
  const Icon = detail ? TYPE_ICONS[detail.type] ?? Wallet : Wallet;
  const isOutgoingTransfer =
    detail?.type === "TRANSFER" && detail.counterpartyRelation === "recipient";
  const isIncomingTransfer =
    detail?.type === "TRANSFER" && detail.counterpartyRelation === "sender";
  const isMemberTransfer = isOutgoingTransfer || isIncomingTransfer;

  const partyDisplay = (name: string, badge?: VerificationBadgeType | string | null) => (
    <UserDisplayName
      name={name}
      verificationBadge={badge}
      badgeSize="sm"
      nameClassName="font-semibold"
    />
  );

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
            className="tx-receipt-modal tx-detail-modal tx-receipt-modal-shell"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              className="tx-receipt-close tx-receipt-close-floating"
              aria-label={t("common.close")}
            >
              <X size={18} />
            </button>

            {loading || !detail ? (
              <div className="tx-detail-loading">
                <Loader2 size={24} className="animate-spin text-accent-brand" />
              </div>
            ) : (
              <>
                <div ref={captureRef} className="tx-receipt-capture">
                  <div className="tx-receipt-header">
                    <div className="tx-detail-type-icon" aria-hidden>
                      <Icon size={22} className="text-accent-brand" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="tx-receipt-eyebrow">{t("brand.name")}</p>
                      <h2 id="transaction-detail-title" className="tx-receipt-title">
                        {t("dashboard.transactionDetail.title")}
                      </h2>
                      <p className="tx-receipt-subtitle">{t("dashboard.transactionDetail.subtitle")}</p>
                    </div>
                  </div>

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
                  {isMemberTransfer && isOutgoingTransfer && detail.ownerName && (
                    <ReceiptRow
                      label={t("dashboard.transactionDetail.from")}
                      value={partyDisplay(detail.ownerName, detail.ownerVerificationBadge)}
                      full
                    />
                  )}
                  {isMemberTransfer && isIncomingTransfer && detail.counterpartyName && (
                    <ReceiptRow
                      label={t("dashboard.transactionDetail.from")}
                      value={partyDisplay(
                        detail.counterpartyName,
                        detail.counterpartyVerificationBadge
                      )}
                      full
                    />
                  )}
                  {isMemberTransfer && isOutgoingTransfer && detail.counterpartyName && (
                    <ReceiptRow
                      label={t("dashboard.transactionDetail.to")}
                      value={partyDisplay(
                        detail.counterpartyName,
                        detail.counterpartyVerificationBadge
                      )}
                      full
                    />
                  )}
                  {isMemberTransfer && isIncomingTransfer && detail.ownerName && (
                    <ReceiptRow
                      label={t("dashboard.transactionDetail.to")}
                      value={partyDisplay(detail.ownerName, detail.ownerVerificationBadge)}
                      full
                    />
                  )}
                  {!isMemberTransfer && detail.counterpartyName && detail.counterpartyRelation === "sender" && (
                    <ReceiptRow
                      label={t("dashboard.transactionDetail.from")}
                      value={partyDisplay(
                        detail.counterpartyName,
                        detail.counterpartyVerificationBadge
                      )}
                      full
                    />
                  )}
                  {!isMemberTransfer && detail.counterpartyName && detail.counterpartyRelation === "recipient" && (
                    <ReceiptRow
                      label={t("dashboard.transactionDetail.to")}
                      value={partyDisplay(
                        detail.counterpartyName,
                        detail.counterpartyVerificationBadge
                      )}
                      full
                    />
                  )}
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
                </div>

                <div className="tx-receipt-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    <Download size={16} />
                    {downloading ? t("common.processing") : t("withdrawals.receipt.download")}
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
  value: ReactNode;
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
