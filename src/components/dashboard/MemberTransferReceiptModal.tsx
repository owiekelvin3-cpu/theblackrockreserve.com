"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Copy, Check, Download, X, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  buildReceiptDownloadText,
  downloadTextFile,
  formatReferenceId,
} from "@/lib/transaction-receipt";
import { toast } from "sonner";

export type MemberTransferReceiptData = {
  id: string;
  amount: number;
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderEmail: string;
  accountName: string;
  note?: string | null;
  createdAt: string;
  status: string;
};

type Props = {
  open: boolean;
  receipt: MemberTransferReceiptData | null;
  onClose: () => void;
};

export default function MemberTransferReceiptModal({ open, receipt, onClose }: Props) {
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.id);
      setCopied(true);
      toast.success(t("withdrawals.memberTransfer.receipt.copied"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleDownload = () => {
    const text = buildReceiptDownloadText({
      title: t("withdrawals.memberTransfer.receipt.title"),
      referenceId,
      status: t("withdrawals.memberTransfer.receipt.completed"),
      amount: formatCurrency(-receipt.amount),
      destination: receipt.recipientEmail,
      destinationExtra: receipt.note,
      paymentMethod: t("withdrawals.memberTransfer.title"),
      dateTime,
      confirmationMessage: t("withdrawals.memberTransfer.receipt.confirmation"),
      brandName: t("brand.name"),
    });
    downloadTextFile(`member-transfer-${receipt.id.slice(-8)}.txt`, text);
    toast.success(t("withdrawals.memberTransfer.receipt.downloaded"));
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
            aria-labelledby="member-transfer-receipt-title"
            className="tx-receipt-modal"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="tx-receipt-header">
              <div className="tx-receipt-success-icon" aria-hidden>
                <CheckCircle2 size={28} className="text-accent-green" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="tx-receipt-eyebrow">{t("brand.name")}</p>
                <h2 id="member-transfer-receipt-title" className="tx-receipt-title">
                  {t("withdrawals.memberTransfer.receipt.successTitle")}
                </h2>
                <p className="tx-receipt-subtitle">{t("withdrawals.memberTransfer.receipt.subtitle")}</p>
              </div>
              <button type="button" onClick={onClose} className="tx-receipt-close" aria-label={t("common.close")}>
                <X size={18} />
              </button>
            </div>

            <div className="tx-receipt-status-banner">
              <span className="tx-receipt-status-dot" aria-hidden />
              <div>
                <p className="tx-receipt-status-label">{t("withdrawals.memberTransfer.receipt.completed")}</p>
                <p className="tx-receipt-status-hint">{t("withdrawals.memberTransfer.receipt.instant")}</p>
              </div>
            </div>

            <div className="tx-receipt-amount-block">
              <p className="tx-receipt-amount-label">{t("withdrawals.memberTransfer.receipt.amountSent")}</p>
              <p className="tx-receipt-amount">{formatCurrency(-receipt.amount)}</p>
            </div>

            <div className="tx-receipt-grid">
              <ReceiptRow label={t("withdrawals.receipt.reference")} value={referenceId} mono />
              <ReceiptRow label={t("withdrawals.receipt.dateTime")} value={dateTime} />
              <ReceiptRow label={t("withdrawals.memberTransfer.receipt.recipient")} value={receipt.recipientName} />
              <ReceiptRow label={t("withdrawals.memberTransfer.recipientEmail")} value={receipt.recipientEmail} full />
              <ReceiptRow label={t("withdrawals.receipt.sourceAccount")} value={receipt.accountName} />
              {receipt.note && (
                <ReceiptRow label={t("withdrawals.memberTransfer.memoOptional")} value={receipt.note} full />
              )}
            </div>

            <div className="tx-receipt-message">
              <Shield size={15} className="text-accent-brand shrink-0 mt-0.5" />
              <p>{t("withdrawals.memberTransfer.receipt.confirmation")}</p>
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
