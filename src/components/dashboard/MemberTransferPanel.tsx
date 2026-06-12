"use client";

import { useState } from "react";
import { Send, Users } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import MemberTransferReceiptModal, {
  type MemberTransferReceiptData,
} from "@/components/dashboard/MemberTransferReceiptModal";
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
  onSuccess?: () => void;
  className?: string;
};

export default function MemberTransferPanel({ accounts, onSuccess, className }: Props) {
  const { t, formatCurrency } = useI18n();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<MemberTransferReceiptData | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const submitTransfer = async (transactionPin: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId,
          recipientEmail: recipientEmail.trim().toLowerCase(),
          amount: Number(amountUsd),
          note: note.trim() || undefined,
          transactionPin,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("withdrawals.memberTransfer.failed"));

      if (json.receipt) {
        setReceiptData(json.receipt as MemberTransferReceiptData);
        setReceiptOpen(true);
      } else {
        toast.success(json.message || t("withdrawals.memberTransfer.success"));
      }
      setRecipientEmail("");
      setAmountUsd("");
      setNote("");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("withdrawals.memberTransfer.failed"));
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
    if (!recipientEmail.trim()) {
      toast.error(t("withdrawals.memberTransfer.emailRequired"));
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
          "rounded-xl border border-accent-brand/35 bg-gradient-to-br from-accent-brand/10 via-transparent to-transparent p-4 sm:p-5",
          className
        )}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-accent-brand/20 border border-accent-brand/30 flex items-center justify-center shrink-0">
            <Users size={20} className="text-accent-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t("withdrawals.memberTransfer.title")}</p>
            <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{t("withdrawals.memberTransfer.subtitle")}</p>
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
            label={t("withdrawals.memberTransfer.recipientEmail")}
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="member@gmail.com"
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
            disabled={submitting || !recipientEmail.trim() || !amountUsd || (selectedAccount?.availableBalance ?? 0) <= 0}
            isLoading={submitting}
          >
            <Send size={16} className="mr-2" />
            {submitting ? t("withdrawals.memberTransfer.sending") : t("withdrawals.memberTransfer.send")}
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
