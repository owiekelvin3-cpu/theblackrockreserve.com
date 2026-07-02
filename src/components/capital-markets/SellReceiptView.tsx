"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Copy, Check, Download, X, Shield, ArrowUpRight, FileText, TrendingUp, TrendingDown,
} from "lucide-react";
import Button from "@/components/ui/Button";
import ReceiptBrandHeader from "@/components/dashboard/ReceiptBrandHeader";
import StockIcon from "@/components/capital-markets/StockIcon";
import { useI18n } from "@/components/providers/I18nProvider";
import { formatReferenceId } from "@/lib/transaction-receipt";
import { downloadReceiptAsImage } from "@/lib/receipt-image";
import type { SellReceiptData } from "@/lib/sell-receipt";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SellReceiptViewProps = {
  receipt: SellReceiptData;
  logoDomain?: string | null;
  logoUrl?: string | null;
  onClose: () => void;
};

export default function SellReceiptView({
  receipt,
  logoDomain,
  logoUrl,
  onClose,
}: SellReceiptViewProps) {
  const { t, formatCurrency, formatDate, formatTime } = useI18n();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const referenceId = formatReferenceId(receipt.id);
  const dateTime = `${formatDate(receipt.createdAt, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} · ${formatTime(receipt.createdAt)}`;
  const positivePnl = receipt.realizedPnl >= 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receipt.id);
      setCopied(true);
      toast.success(t("sell.receipt.copied"));
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
        `sell-receipt-${receipt.id.slice(-8)}.png`,
        { width: 440 }
      );
      toast.success(t("sell.receipt.downloaded"));
    } catch {
      toast.error(t("sell.receipt.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="cm-sell-receipt"
    >
      <button
        type="button"
        onClick={onClose}
        className="tx-receipt-close tx-receipt-close-floating"
        aria-label={t("common.close")}
      >
        <X size={18} />
      </button>

      <ReceiptBrandHeader />

      <div className="cm-sell-success-hero">
        <div className="cm-sell-success-ring" aria-hidden>
          <div className="cm-sell-success-check">
            <Check size={22} strokeWidth={3} />
          </div>
        </div>
        <p className="cm-sell-success-eyebrow">{t("sell.receipt.statusLabel")}</p>
        <h2 id="sell-receipt-title" className="cm-sell-success-title">
          {t("sell.receipt.title")}
        </h2>
        <p className="cm-sell-success-amount">{formatCurrency(receipt.netProceeds)}</p>
        <div className="cm-sell-success-status">
          <span className="cm-sell-success-status-dot" aria-hidden />
          <span>{receipt.symbol}</span>
          <span className="cm-sell-success-status-sep" aria-hidden>·</span>
          <span className="cm-sell-success-ref">{referenceId}</span>
        </div>
      </div>

      <div ref={captureRef} className="tx-receipt-capture cm-sell-receipt-capture">
        <ReceiptBrandHeader />
        <div className="tx-receipt-header">
          <div className="min-w-0 flex-1">
            <h2 className="tx-receipt-title">{t("sell.receipt.title")}</h2>
            <p className="tx-receipt-subtitle">{t("sell.receipt.subtitle")}</p>
          </div>
        </div>

        <div className="tx-receipt-status-banner">
          <span className="tx-receipt-status-dot tx-receipt-status-dot-success" aria-hidden />
          <div>
            <p className="tx-receipt-status-label">{t("sell.receipt.statusLabel")}</p>
            <p className="tx-receipt-status-hint">{t("sell.receipt.statusHint")}</p>
          </div>
        </div>

        <div className="cm-sell-asset-card">
          <StockIcon
            symbol={receipt.symbol}
            name={receipt.assetName}
            logoDomain={logoDomain}
            logoUrl={logoUrl}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)] truncate">{receipt.assetName}</p>
            <p className="text-xs font-mono text-[var(--text-muted)]">{receipt.symbol}</p>
          </div>
        </div>

        <div className="tx-receipt-amount-block">
          <p className="tx-receipt-amount-label">{t("sell.receipt.amount")}</p>
          <p className="tx-receipt-amount">{formatCurrency(receipt.netProceeds)}</p>
        </div>

        <div className="tx-receipt-grid cm-sell-receipt-grid">
          <ReceiptRow label={t("sell.receipt.reference")} value={referenceId} mono />
          <ReceiptRow label={t("sell.receipt.dateTime")} value={dateTime} full />
          <ReceiptRow label={t("sell.receipt.sharesSold")} value={receipt.sharesSold.toFixed(6)} mono />
          <ReceiptRow label={t("sell.receipt.salePrice")} value={formatCurrency(receipt.priceAtSale)} />
          <ReceiptRow label={t("sell.receipt.grossProceeds")} value={formatCurrency(receipt.grossProceeds)} />
          <ReceiptRow label={t("sell.receipt.transactionFee")} value={formatCurrency(receipt.fee)} />
          <ReceiptRow label={t("sell.receipt.costBasis")} value={formatCurrency(receipt.costBasis)} />
          <ReceiptRow
            label={t("sell.receipt.realizedPl")}
            value={`${positivePnl ? "+" : ""}${formatCurrency(receipt.realizedPnl)}`}
            valueClassName={positivePnl ? "text-accent-green" : "text-accent-red"}
            icon={
              positivePnl ? (
                <TrendingUp size={13} className="text-accent-green shrink-0" />
              ) : (
                <TrendingDown size={13} className="text-accent-red shrink-0" />
              )
            }
          />
        </div>

        <div className="tx-receipt-message">
          <Shield size={15} className="text-accent-brand shrink-0 mt-0.5" />
          <p>{t("sell.receipt.confirmation")}</p>
        </div>
      </div>

      <div className="tx-receipt-footer-actions">
        <div className="tx-receipt-actions">
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[44px] sm:flex-1"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={16} className="shrink-0" />
            {downloading ? t("common.processing") : t("sell.receipt.download")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full min-h-[44px] sm:flex-1"
            onClick={handleCopy}
          >
            {copied ? (
              <Check size={16} className="shrink-0 text-accent-green" />
            ) : (
              <Copy size={16} className="shrink-0" />
            )}
            {t("sell.receipt.copyId")}
          </Button>
        </div>

        <Link href="/dashboard/transactions" className="tx-receipt-link-btn" onClick={onClose}>
          <FileText size={15} />
          {t("sell.receipt.viewActivity")}
          <ArrowUpRight size={14} />
        </Link>
        <Button type="button" className="w-full min-h-[44px]" onClick={onClose}>
          {t("sell.receipt.close")}
        </Button>
      </div>
    </motion.div>
  );
}

function ReceiptRow({
  label,
  value,
  mono,
  full,
  icon,
  valueClassName,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
  icon?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className={full ? "tx-receipt-row tx-receipt-row-full" : "tx-receipt-row"}>
      <span className="tx-receipt-row-label">{label}</span>
      <span
        className={cn(
          "tx-receipt-row-value inline-flex items-center gap-1 justify-end",
          mono && "tx-receipt-mono",
          valueClassName
        )}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}
