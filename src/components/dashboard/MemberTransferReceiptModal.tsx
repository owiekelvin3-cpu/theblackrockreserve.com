"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, CheckCircle2, Download, X, ArrowDown } from "lucide-react";
import Button from "@/components/ui/Button";
import AppIconMark from "@/components/ui/AppIconMark";
import UserDisplayName from "@/components/ui/UserDisplayName";
import { useI18n } from "@/components/providers/I18nProvider";
import { formatReferenceId } from "@/lib/transaction-receipt";
import { downloadReceiptAsImage } from "@/lib/receipt-image";
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

const spring = { type: "spring" as const, stiffness: 380, damping: 28 };

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
  const [downloading, setDownloading] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const referenceId = formatReferenceId(receipt.id);
  const dateTime = `${formatDate(receipt.createdAt, {
    month: "short",
    day: "numeric",
    year: "numeric",
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

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      await downloadReceiptAsImage(
        captureRef.current,
        `member-transfer-${receipt.id.slice(-8)}.png`,
        { backgroundColor: "#141416" }
      );
      toast.success(t("withdrawals.memberTransfer.receipt.downloaded"));
    } catch {
      toast.error(t("withdrawals.receipt.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      className="tx-member-transfer-page"
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.button
        type="button"
        aria-label={t("common.close")}
        className="tx-member-transfer-page-dismiss"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div aria-hidden className="tx-member-transfer-page-blur" />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-transfer-receipt-title"
        className="tx-mt-receipt-card tx-receipt-modal-shell"
        initial={{ opacity: 0, y: 48, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ ...spring, delay: 0.04 }}
      >
        <button
          type="button"
          onClick={onClose}
          className="tx-mt-receipt-close tx-receipt-close-floating"
          aria-label={t("common.close")}
        >
          <X size={18} />
        </button>

        <div ref={captureRef} className="tx-receipt-capture tx-mt-receipt-capture">
        <div className="tx-mt-receipt-glow" aria-hidden />

        <div className="tx-mt-receipt-header">
          <div className="tx-mt-receipt-brand">
            <AppIconMark size={28} className="rounded-lg" />
            <span className="tx-mt-receipt-brand-name">{t("brand.name")}</span>
          </div>
        </div>

        <motion.div
          className="tx-mt-success-hero"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
        >
          <motion.div
            className="tx-mt-success-ring"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...spring, delay: 0.14 }}
          >
            <motion.div
              className="tx-mt-success-check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring, delay: 0.28 }}
            >
              <Check size={28} strokeWidth={3} />
            </motion.div>
          </motion.div>

          <motion.p
            className="tx-mt-success-eyebrow"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            {t("withdrawals.memberTransfer.receipt.instant")}
          </motion.p>

          <motion.h2
            id="member-transfer-receipt-title"
            className="tx-mt-success-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
          >
            {t("withdrawals.memberTransfer.receipt.successTitle")}
          </motion.h2>

          <motion.p
            className="tx-mt-success-amount"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.32 }}
          >
            {formatCurrency(receipt.amount)}
          </motion.p>

          <motion.div
            className="tx-mt-success-status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
          >
            <CheckCircle2 size={14} className="text-accent-green shrink-0" />
            <span>{t("withdrawals.memberTransfer.receipt.completed")}</span>
            <span className="tx-mt-success-status-dot" aria-hidden />
            <span className="tx-mt-success-ref">{referenceId}</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="tx-mt-parties"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.42 }}
        >
          <PartyCard
            roleLabel={t("withdrawals.memberTransfer.receipt.sender")}
            name={receipt.senderName}
            badge={receipt.senderVerificationBadge}
            meta={
              receipt.senderAccountNumber
                ? formatBankAccountNumberDisplay(receipt.senderAccountNumber)
                : receipt.accountName
            }
          />
          <div className="tx-mt-parties-arrow" aria-hidden>
            <ArrowDown size={18} />
          </div>
          <PartyCard
            roleLabel={t("withdrawals.memberTransfer.receipt.beneficiary")}
            name={receipt.recipientName}
            badge={receipt.recipientVerificationBadge}
            meta={formatBankAccountNumberDisplay(receipt.recipientAccountNumber)}
            highlight
          />
        </motion.div>

        <motion.dl
          className="tx-mt-details-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
        >
          <DetailRow label={t("withdrawals.receipt.dateTime")} value={dateTime} />
          <DetailRow label={t("withdrawals.memberTransfer.receipt.transferType")} value={t("withdrawals.memberTransfer.title")} />
          <DetailRow label={t("withdrawals.receipt.sourceAccount")} value={receipt.accountName} />
          {receipt.note && (
            <DetailRow label={t("withdrawals.memberTransfer.memoOptional")} value={receipt.note} />
          )}
        </motion.dl>

        <motion.p
          className="tx-mt-secure-note"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.52 }}
        >
          {t("withdrawals.memberTransfer.receipt.confirmationShort")}
        </motion.p>
        </div>

        <motion.div
          className="tx-mt-receipt-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.56 }}
        >
          <Button type="button" className="tx-mt-done-btn w-full" onClick={onClose}>
            {t("withdrawals.receipt.close")}
          </Button>
          <div className="tx-mt-secondary-actions">
            <button
              type="button"
              className="tx-mt-secondary-btn"
              onClick={handleDownload}
              disabled={downloading}
            >
              <Download size={16} />
              <span>{downloading ? t("common.processing") : t("withdrawals.receipt.download")}</span>
            </button>
            <button type="button" className="tx-mt-secondary-btn" onClick={handleCopy}>
              {copied ? <Check size={16} className="text-accent-green" /> : <Copy size={16} />}
              <span>{t("withdrawals.receipt.copyId")}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function PartyCard({
  roleLabel,
  name,
  badge,
  meta,
  highlight,
}: {
  roleLabel: string;
  name: string;
  badge?: VerificationBadgeType | string | null;
  meta: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "tx-mt-party tx-mt-party-highlight" : "tx-mt-party"}>
      <p className="tx-mt-party-role">{roleLabel}</p>
      <UserDisplayName
        name={name}
        verificationBadge={badge}
        badgeSize="sm"
        nameClassName="text-sm font-semibold text-text-primary"
      />
      <p className="tx-mt-party-meta">{meta}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="tx-mt-detail-row">
      <dt className="tx-mt-detail-row-label">{label}</dt>
      <dd className="tx-mt-detail-row-value">{value}</dd>
    </div>
  );
}
