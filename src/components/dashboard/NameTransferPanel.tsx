"use client";

import { useState } from "react";
import { Send, UserRound } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import type { MemberTransferReceiptData } from "@/components/dashboard/MemberTransferReceiptModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
  availableBalance: number;
};

type Props = {
  accounts: AccountOption[];
  onTransferComplete?: (receipt: MemberTransferReceiptData) => void;
  className?: string;
};

export default function NameTransferPanel({ accounts, onTransferComplete, className }: Props) {
  const { t, formatCurrency } = useI18n();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [recipientName, setRecipientName] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const submitTransfer = async (transactionPin: string) => {
    const transferAmount = Number(amountUsd);
    const name = recipientName.trim();
    const memo = note.trim() || null;
    const sourceAccountName = selectedAccount?.name ?? "";

    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/transfers/by-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId,
          recipientName: name,
          amount: transferAmount,
          note: memo || undefined,
          transactionPin,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("withdrawals.nameTransfer.failed"));

      const receipt: MemberTransferReceiptData = json.receipt
        ? (json.receipt as MemberTransferReceiptData)
        : {
            id: json.referenceId ?? `transfer-${Date.now()}`,
            amount: Number(json.amount ?? transferAmount),
            recipientAccountNumber: "",
            recipientName: name,
            recipientVerificationBadge: null,
            senderName: (json.senderName as string) ?? "",
            senderVerificationBadge: json.senderVerificationBadge ?? null,
            senderAccountNumber: json.senderAccountNumber ?? null,
            accountName: sourceAccountName,
            note: memo,
            createdAt: new Date().toISOString(),
            status: "COMPLETED",
            transferMethod: "name",
          };

      setRecipientName("");
      setAmountUsd("");
      setNote("");

      onTransferComplete?.(receipt);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("withdrawals.nameTransfer.failed"));
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountUsd);
    if (!accountId) {
      toast.error(t("withdrawals.errors.noAccount"));
      return;
    }
    if (!recipientName.trim()) {
      toast.error(t("withdrawals.nameTransfer.recipientNameRequired"));
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("withdrawals.errors.invalidAmount"));
      return;
    }
    const available = selectedAccount?.availableBalance ?? 0;
    if (amount > available) {
      toast.error(t("withdrawals.errors.insufficientBalance", { amount: formatCurrency(available) }));
      return;
    }

    requestPin(async (transactionPin) => {
      await submitTransfer(transactionPin);
    });
  };

  if (accounts.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "rounded-xl border border-accent-gold/35 bg-gradient-to-br from-accent-gold/10 via-transparent to-transparent p-4 sm:p-5",
          className
        )}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-accent-gold/20 border border-accent-gold/30 flex items-center justify-center shrink-0">
            <UserRound size={20} className="text-accent-gold" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t("withdrawals.nameTransfer.title")}</p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{t("withdrawals.nameTransfer.subtitle")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">{t("withdrawals.withdrawFrom")}</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-text-primary text-sm min-h-[44px]"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency}) — {formatCurrency(a.availableBalance)} available
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t("withdrawals.nameTransfer.recipientName")}
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={t("withdrawals.nameTransfer.recipientNamePlaceholder")}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t("withdrawals.amountUsd")}
              type="number"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
            <Input
              label={t("withdrawals.memberTransfer.memoOptional")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("withdrawals.memberTransfer.memoPlaceholder")}
            />
          </div>

          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={
              submitting ||
              !recipientName.trim() ||
              !amountUsd ||
              (selectedAccount?.availableBalance ?? 0) <= 0
            }
            isLoading={submitting}
          >
            <Send size={16} className="mr-2" />
            {submitting ? t("withdrawals.nameTransfer.sending") : t("withdrawals.nameTransfer.send")}
          </Button>
        </form>
      </div>

      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || submitting}
        error={pinError}
      />
    </>
  );
}
