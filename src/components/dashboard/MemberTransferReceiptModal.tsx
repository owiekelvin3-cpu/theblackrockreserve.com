"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Copy, Check, Download, X } from "lucide-react";
import Button from "@/components/ui/Button";
import AppIconMark from "@/components/ui/AppIconMark";
import UserDisplayName from "@/components/ui/UserDisplayName";
import { useI18n } from "@/components/providers/I18nProvider";
import {
  buildReceiptDownloadText,
  downloadTextFile,
  formatReferenceId,
} from "@/lib/transaction-receipt";
import { formatBankAccountNumberDisplay } from "@/lib/bank-account-number";
import type { VerificationBadgeType } from "@/lib/verification-badge";
import { toast } from "sonner";

export type MemberTransferReceiptData = {
  id: string;
  amount: number;
  recipientAccountNumber: string;
  recipientName: string;
  recipientVerificationBadge?: VerificationBadgeType | string | null;
  senderName: string;
  senderVerificationBadge?: VerificationBadgeType | string | null;
  senderAccountNumber?: string | null;
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

function lockPageScroll() {
  const scrollY = window.scrollY;
  const { style } = document.body;
  const prev = {
    position: style.position,
    top: style.top,
    left: style.left,
    right: style.right,
    width: style.width,
    overflow: style.overflow,
  };

  document.documentElement.classList.add("tx-member-transfer-scroll-lock");
  style.position = "fixed";
  style.top = `-${scrollY}px`;
  style.left = "0";
  style.right = "0";
  style.width = "100%";
  style.overflow = "hidden";

  return () => {
    document.documentElement.classList.remove("tx-member-transfer-scroll-lock");
    style.position = prev.position;
    style.top = prev.top;
    style.left = prev.left;
    style.right = prev.right;
    style.width = prev.width;
    style.overflow = prev.overflow;
    window.scrollTo(0, scrollY);
  };
}

export default function MemberTransferReceiptModal({ open, receipt, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    return lockPageScroll();
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && receipt ? (
        <MemberTransferReceiptView receipt={receipt} onClose={onClose} />
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function MemberTransferReceiptView({
  receipt,
  onClose,
}: {
  receipt: MemberTransferReceiptData;
  onClose: () => void;
}) {
  const { t, formatCurrency, formatDate, formatTime } = useI18n();
  const [copied, setCopied] = useState(false);

  const referenceId = formatReferenceId(receipt.id);
  const dateTime = `${formatDate(receipt.createdAt, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${formatTime(receipt.createdAt)}`;

  const fullDateTime = `${formatDate(receipt.createdAt, {
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
      amount: formatCurrency(receipt.amount),
      destination: formatBankAccountNumberDisplay(receipt.recipientAccountNumber),
      destinationExtra: receipt.note,
      paymentMethod: t("withdrawals.memberTransfer.title"),
      dateTime: fullDateTime,
      confirmationMessage: t("withdrawals.memberTransfer.receipt.confirmation"),
      brandName: t("brand.name"),
    });
    downloadTextFile(`member-transfer-${receipt.id.slice(-8)}.txt`, text);
    toast.success(t("withdrawals.memberTransfer.receipt.downloaded"));
  };

  return (
    <motion.div
      className="tx-member-transfer-page"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      <motion.div
        aria-hidden
        className="tx-member-transfer-page-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-transfer-receipt-title"
        className="tx-receipt-modal tx-member-transfer-receipt"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="tx-mt-top">
          <div className="tx-mt-brand">
            <span className="tx-mt-brand-icon" aria-hidden>
              <AppIconMark size={32} className="rounded-lg" />
            </span>
            <div className="min-w-0">
              <p className="tx-mt-brand-name">{t("brand.name")}</p>
              <p className="tx-mt-brand-tag">{t("withdrawals.memberTransfer.receipt.subtitle")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="tx-receipt-close tx-mt-close" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>

        <div className="tx-mt-hero">
          <div className="tx-mt-hero-icon" aria-hidden>
            <CheckCircle2 size={22} className="text-accent-green" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="member-transfer-receipt-title" className="tx-mt-title">
              {t("withdrawals.memberTransfer.receipt.successTitle")}
            </h2>
            <p className="tx-mt-meta">
              {t("withdrawals.memberTransfer.receipt.completed")} · {referenceId}
            </p>
          </div>
          <p className="tx-mt-amount">{formatCurrency(receipt.amount)}</p>
        </div>

        <dl className="tx-mt-details">
          <DetailItem label={t("withdrawals.receipt.dateTime")} value={dateTime} />
          <DetailItem label={t("withdrawals.memberTransfer.receipt.transferType")} value={t("withdrawals.memberTransfer.title")} />
          <DetailItem label={t("withdrawals.receipt.sourceAccount")} value={receipt.accountName} />
          <DetailItem
            label={t("withdrawals.memberTransfer.receipt.sender")}
            valueNode={
              <UserDisplayName
                name={receipt.senderName}
                verificationBadge={receipt.senderVerificationBadge}
                badgeSize="xs"
                nameClassName="text-sm font-medium text-text-primary"
              />
            }
            sub={
              receipt.senderAccountNumber
                ? formatBankAccountNumberDisplay(receipt.senderAccountNumber)
                : undefined
            }
          />
          <DetailItem
            label={t("withdrawals.memberTransfer.receipt.beneficiary")}
            valueNode={
              <UserDisplayName
                name={receipt.recipientName}
                verificationBadge={receipt.recipientVerificationBadge}
                badgeSize="xs"
                nameClassName="text-sm font-medium text-text-primary"
              />
            }
            sub={formatBankAccountNumberDisplay(receipt.recipientAccountNumber)}
          />
          {receipt.note && (
            <DetailItem label={t("withdrawals.memberTransfer.memoOptional")} value={receipt.note} />
          )}
        </dl>

        <p className="tx-mt-footnote">{t("withdrawals.memberTransfer.receipt.confirmationShort")}</p>

        <div className="tx-mt-actions">
          <button type="button" className="tx-mt-action-btn" onClick={handleDownload}>
            <Download size={15} />
            <span>{t("withdrawals.receipt.download")}</span>
          </button>
          <button type="button" className="tx-mt-action-btn" onClick={handleCopy}>
            {copied ? <Check size={15} className="text-accent-green" /> : <Copy size={15} />}
            <span>{t("withdrawals.receipt.copyId")}</span>
          </button>
          <Button type="button" size="sm" className="tx-mt-close-btn" onClick={onClose}>
            {t("withdrawals.receipt.close")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailItem({
  label,
  value,
  valueNode,
  sub,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  sub?: string;
}) {
  return (
    <div className="tx-mt-detail">
      <dt className="tx-mt-detail-label">{label}</dt>
      <dd className="tx-mt-detail-value">
        {valueNode ?? <span>{value}</span>}
        {sub && <span className="tx-mt-detail-sub">{sub}</span>}
      </dd>
    </div>
  );
}
