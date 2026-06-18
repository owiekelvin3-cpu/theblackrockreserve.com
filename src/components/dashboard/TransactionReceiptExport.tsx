"use client";

import { forwardRef, type ReactNode } from "react";
import AppIconMark from "@/components/ui/AppIconMark";
import UserDisplayName from "@/components/ui/UserDisplayName";
import { useI18n } from "@/components/providers/I18nProvider";
import { transactionTypeLabel } from "@/lib/transaction-receipt";
import { cn } from "@/lib/utils";
import type { VerificationBadgeType } from "@/lib/verification-badge";

export type TransactionReceiptExportData = {
  id: string;
  referenceId: string;
  description: string;
  type: string;
  amount: number;
  status: string;
  statusLabel: string;
  date: string;
  ownerName?: string | null;
  ownerVerificationBadge?: VerificationBadgeType | string | null;
  counterpartyName?: string | null;
  counterpartyVerificationBadge?: VerificationBadgeType | string | null;
  counterpartyRelation?: "sender" | "recipient" | null;
  account: {
    name: string;
    currency: string;
    maskedNumber: string;
  };
};

type TransactionReceiptExportProps = {
  detail: TransactionReceiptExportData;
  className?: string;
};

const TransactionReceiptExport = forwardRef<HTMLDivElement, TransactionReceiptExportProps>(
  function TransactionReceiptExport({ detail, className }, ref) {
    const { t, formatCurrency, formatDate, formatTime } = useI18n();

    const isOutgoingTransfer =
      detail.type === "TRANSFER" && detail.counterpartyRelation === "recipient";
    const isIncomingTransfer =
      detail.type === "TRANSFER" && detail.counterpartyRelation === "sender";
    const isMemberTransfer = isOutgoingTransfer || isIncomingTransfer;

    const statusKey = detail.status.toLowerCase();
    const generatedAt = new Date().toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    return (
      <div ref={ref} className={cn("receipt-export-document", className)}>
        <div className="receipt-export-brand">
          <AppIconMark size={36} className="rounded-xl" />
          <div>
            <p className="receipt-export-brand-name">{t("brand.name")}</p>
            <p className="receipt-export-brand-tag">{t("dashboard.transactionDetail.subtitle")}</p>
          </div>
        </div>

        <div className="receipt-export-divider" />

        <div className="receipt-export-status">
          <span
            className={cn(
              "receipt-export-status-dot",
              statusKey === "completed" && "receipt-export-status-dot-success",
              statusKey === "failed" && "receipt-export-status-dot-failed"
            )}
          />
          <div>
            <p className="receipt-export-status-type">{transactionTypeLabel(detail.type)}</p>
            <p className="receipt-export-status-label">{detail.statusLabel}</p>
          </div>
        </div>

        <div className="receipt-export-amount-block">
          <p className="receipt-export-amount-label">{t("dashboard.transactionDetail.amount")}</p>
          <p
            className={cn(
              "receipt-export-amount",
              detail.amount >= 0 ? "receipt-export-amount-credit" : "receipt-export-amount-debit"
            )}
          >
            {detail.amount >= 0 ? "+" : ""}
            {formatCurrency(detail.amount)}
          </p>
        </div>

        <div className="receipt-export-divider" />

        <div className="receipt-export-fields">
          <ExportField label={t("dashboard.transactionDetail.reference")} value={detail.referenceId} mono />
          <ExportField
            label={t("dashboard.transactionDetail.dateTime")}
            value={`${formatDate(detail.date)} · ${formatTime(detail.date)}`}
          />

          {isMemberTransfer && isOutgoingTransfer && detail.ownerName && (
            <ExportField
              label={t("dashboard.transactionDetail.from")}
              value={
                <UserDisplayName
                  name={detail.ownerName}
                  verificationBadge={detail.ownerVerificationBadge}
                  badgeSize="sm"
                  nameClassName="font-semibold"
                />
              }
              full
            />
          )}
          {isMemberTransfer && isIncomingTransfer && detail.counterpartyName && (
            <ExportField
              label={t("dashboard.transactionDetail.from")}
              value={
                <UserDisplayName
                  name={detail.counterpartyName}
                  verificationBadge={detail.counterpartyVerificationBadge}
                  badgeSize="sm"
                  nameClassName="font-semibold"
                />
              }
              full
            />
          )}
          {isMemberTransfer && isOutgoingTransfer && detail.counterpartyName && (
            <ExportField
              label={t("dashboard.transactionDetail.to")}
              value={
                <UserDisplayName
                  name={detail.counterpartyName}
                  verificationBadge={detail.counterpartyVerificationBadge}
                  badgeSize="sm"
                  nameClassName="font-semibold"
                />
              }
              full
            />
          )}
          {isMemberTransfer && isIncomingTransfer && detail.ownerName && (
            <ExportField
              label={t("dashboard.transactionDetail.to")}
              value={
                <UserDisplayName
                  name={detail.ownerName}
                  verificationBadge={detail.ownerVerificationBadge}
                  badgeSize="sm"
                  nameClassName="font-semibold"
                />
              }
              full
            />
          )}

          <ExportField
            label={t("dashboard.transactionDetail.account")}
            value={`${detail.account.name} · ${detail.account.currency}`}
          />
          <ExportField
            label={t("dashboard.transactionDetail.accountNumber")}
            value={detail.account.maskedNumber}
            mono
          />
          <ExportField
            label={t("dashboard.transactionDetail.description")}
            value={detail.description}
            full
          />
        </div>

        <div className="receipt-export-divider" />

        <div className="receipt-export-footer">
          <p className="receipt-export-footer-title">{t("dashboard.transactionDetail.title")}</p>
          <p className="receipt-export-footer-note">{t("dashboard.transactionDetail.exportDisclaimer")}</p>
          <p className="receipt-export-footer-meta">
            {t("dashboard.transactionDetail.exportTransactionId")}: {detail.id}
          </p>
          <p className="receipt-export-footer-meta">
            {t("dashboard.transactionDetail.exportGenerated")}: {generatedAt}
          </p>
        </div>
      </div>
    );
  }
);

export default TransactionReceiptExport;

function ExportField({
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
    <div className={full ? "receipt-export-field receipt-export-field-full" : "receipt-export-field"}>
      <span className="receipt-export-field-label">{label}</span>
      <span className={mono ? "receipt-export-field-value receipt-export-field-mono" : "receipt-export-field-value"}>
        {value}
      </span>
    </div>
  );
}
