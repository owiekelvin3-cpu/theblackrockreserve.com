"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Download, X, Clock, Shield,
  ArrowUpRight, FileText,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { LogoMark } from "@/components/layout/Logo";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  buildReceiptDownloadText,
  downloadTextFile,
  formatReferenceId,
  maskDestination,
} from "@/lib/transaction-receipt";
import { toast } from "sonner";
import type { WithdrawalReceiptData } from "@/lib/withdrawal-receipt";

export type { WithdrawalReceiptData };

type WithdrawalReceiptModalProps = {
  open: boolean;
  receipt: WithdrawalReceiptData | null;
  onClose: () => void;
};

export default function WithdrawalReceiptModal({
  open,
  receipt,
  onClose,
}: WithdrawalReceiptModalProps) {
  const { t, formatCurrency, formatDate, formatTime } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!receipt) return null;

  const referenceId = formatReferenceId(receipt.id);
  const dateTime = `${formatDate(receipt.createdAt, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} · ${formatTime(receipt.createdAt)}`;

  const confirmationMessage = receipt.requiresChargePayment
    ? t("withdrawals.receipt.confirmationCharge")
    : t("withdrawals.receipt.confirmation");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.id);
      setCopied(true);
      toast.success(t("withdrawals.receipt.copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDownload = () => {
    const text = buildReceiptDownloadText({
      title: t("withdrawals.receipt.title"),
      referenceId,
      status: receipt.displayStatus,
      amount: formatCurrency(receipt.amountUsd),
      destination: receipt.destination,
      destinationExtra: receipt.destinationExtra,
      paymentMethod: receipt.methodLabel,
      dateTime,
      estimatedTime: receipt.estimatedProcessingTime,
      confirmationMessage,
      brandName: t("brand.name"),
    });
    downloadTextFile(`withdrawal-receipt-${receipt.id.slice(-8)}.txt`, text);
    toast.success(t("withdrawals.receipt.downloaded"));
  };

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
            aria-labelledby="withdrawal-receipt-title"
            className="tx-receipt-modal"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tx-receipt-header">
              <div className="tx-receipt-success-icon tx-receipt-brand-icon-wrap" aria-hidden>
                <LogoMark size="sm" className="rounded-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="tx-receipt-eyebrow">{t("brand.name")}</p>
                <h2 id="withdrawal-receipt-title" className="tx-receipt-title">
                  {t("withdrawals.receipt.title")}
                </h2>
                <p className="tx-receipt-subtitle">{t("withdrawals.receipt.subtitle")}</p>
              </div>
              <button type="button" onClick={onClose} className="tx-receipt-close" aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>

            <div className="tx-receipt-status-banner">
              <span className="tx-receipt-status-dot" aria-hidden />
              <div>
                <p className="tx-receipt-status-label">{receipt.displayStatus}</p>
                <p className="tx-receipt-status-hint">{receipt.currentStatus}</p>
              </div>
            </div>

            <div className="tx-receipt-amount-block">
              <p className="tx-receipt-amount-label">{t("withdrawals.receipt.amount")}</p>
              <p className="tx-receipt-amount">{formatCurrency(receipt.amountUsd)}</p>
            </div>

            <div className="tx-receipt-grid">
              <ReceiptRow label={t("withdrawals.receipt.reference")} value={referenceId} mono />
              <ReceiptRow label={t("withdrawals.receipt.dateTime")} value={dateTime} />
              <ReceiptRow label={t("withdrawals.receipt.paymentMethod")} value={receipt.methodLabel} />
              {receipt.accountName && (
                <ReceiptRow label={t("withdrawals.receipt.sourceAccount")} value={receipt.accountName} />
              )}
              <ReceiptRow
                label={t("withdrawals.receipt.destination")}
                value={maskDestination(receipt.destination, 8)}
                full
              />
              {receipt.destinationExtra && (
                <ReceiptRow label={t("withdrawals.receipt.destinationDetails")} value={receipt.destinationExtra} full />
              )}
              <ReceiptRow label={t("withdrawals.receipt.currentStatus")} value={receipt.currentStatus} />
              {receipt.estimatedProcessingTime && (
                <ReceiptRow
                  label={t("withdrawals.receipt.estimatedTime")}
                  value={receipt.estimatedProcessingTime}
                  icon={<Clock size={13} className="text-accent-brand" />}
                />
              )}
              {receipt.requiresChargePayment && receipt.chargeAmount != null && (
                <ReceiptRow
                  label={t("withdrawals.receipt.processingCharge")}
                  value={formatCurrency(receipt.chargeAmount)}
                />
              )}
            </div>

            <div className="tx-receipt-message">
              <Shield size={15} className="text-accent-brand shrink-0 mt-0.5" />
              <p>{confirmationMessage}</p>
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

            <div className="tx-receipt-footer-actions">
              <Link href="/dashboard/withdrawals" className="tx-receipt-link-btn" onClick={onClose}>
                <FileText size={15} />
                {t("withdrawals.receipt.viewHistory")}
                <ArrowUpRight size={14} />
              </Link>
              <Button type="button" className="w-full min-h-[44px]" onClick={onClose}>
                {t("withdrawals.receipt.close")}
              </Button>
            </div>
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
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={full ? "tx-receipt-row tx-receipt-row-full" : "tx-receipt-row"}>
      <span className="tx-receipt-row-label">{label}</span>
      <span className={mono ? "tx-receipt-row-value tx-receipt-mono" : "tx-receipt-row-value"}>
        {icon}
        {value}
      </span>
    </div>
  );
}
