"use client";

import { useEffect, useState } from "react";
import { Send, Users } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import UserDisplayName from "@/components/ui/UserDisplayName";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import type { MemberTransferReceiptData } from "@/components/dashboard/MemberTransferReceiptModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { VerificationBadgeType } from "@/lib/verification-badge";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
  balance: number;
  availableBalance: number;
};

type Props = {
  accounts: AccountOption[];
  onTransferComplete?: (receipt: MemberTransferReceiptData) => void;
  className?: string;
};

export default function MemberTransferPanel({ accounts, onTransferComplete, className }: Props) {
  const { t, formatCurrency } = useI18n();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState<string | null>(null);
  const [beneficiaryVerificationBadge, setBeneficiaryVerificationBadge] =
    useState<VerificationBadgeType | string | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "loading" | "found" | "not_found" | "error">("idle");
  const [amountUsd, setAmountUsd] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  useEffect(() => {
    const trimmed = recipientAccountNumber.trim();
    if (trimmed.length < 8) {
      setBeneficiaryName(null);
      setBeneficiaryVerificationBadge(null);
      setLookupState("idle");
      return;
    }

    setLookupState("loading");
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/dashboard/transfers/lookup?accountNumber=${encodeURIComponent(trimmed)}`,
          { credentials: "include" }
        );
        const json = await res.json();
        if (!res.ok || !json.found) {
          setBeneficiaryName(null);
          setBeneficiaryVerificationBadge(null);
          setLookupState("not_found");
          return;
        }
        setBeneficiaryName(json.name as string);
        setBeneficiaryVerificationBadge((json.verificationBadge as string) ?? "NONE");
        setLookupState("found");
      } catch {
        setBeneficiaryName(null);
        setBeneficiaryVerificationBadge(null);
        setLookupState("error");
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [recipientAccountNumber]);

  const submitTransfer = async (transactionPin: string) => {
    const transferAmount = Number(amountUsd);
    const recipientNumber = recipientAccountNumber.trim();
    const recipientName = beneficiaryName ?? "";
    const recipientBadge = beneficiaryVerificationBadge;
    const memo = note.trim() || null;
    const sourceAccountName = selectedAccount?.name ?? "";

    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId,
          recipientAccountNumber: recipientNumber,
          amount: transferAmount,
          note: memo || undefined,
          transactionPin,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("withdrawals.memberTransfer.failed"));

      const receipt: MemberTransferReceiptData = json.receipt
        ? (json.receipt as MemberTransferReceiptData)
        : {
            id: json.referenceId ?? `transfer-${Date.now()}`,
            amount: Number(json.amount ?? transferAmount),
            recipientAccountNumber: recipientNumber,
            recipientName: recipientName || (json.recipientName as string) || "",
            recipientVerificationBadge: recipientBadge,
            senderName: (json.senderName as string) ?? "",
            senderVerificationBadge: json.senderVerificationBadge ?? null,
            senderAccountNumber: json.senderAccountNumber ?? null,
            accountName: sourceAccountName,
            note: memo,
            createdAt: new Date().toISOString(),
            status: "COMPLETED",
          };

      setRecipientAccountNumber("");
      setBeneficiaryName(null);
      setBeneficiaryVerificationBadge(null);
      setLookupState("idle");
      setAmountUsd("");
      setNote("");

      onTransferComplete?.(receipt);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("withdrawals.memberTransfer.failed"));
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
    if (!recipientAccountNumber.trim()) {
      toast.error(t("withdrawals.memberTransfer.accountNumberRequired"));
      return;
    }
    if (lookupState !== "found" || !beneficiaryName) {
      toast.error(t("withdrawals.memberTransfer.beneficiaryRequired"));
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

  const beneficiaryHint =
    lookupState === "loading"
      ? t("withdrawals.memberTransfer.verifyingBeneficiary")
      : lookupState === "not_found"
        ? t("withdrawals.memberTransfer.beneficiaryNotFound")
        : lookupState === "error"
          ? t("withdrawals.memberTransfer.beneficiaryLookupFailed")
          : null;

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
                  {a.name} ({a.currency}) — {formatCurrency(a.balance)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Input
              label={t("withdrawals.memberTransfer.recipientAccountNumber")}
              value={recipientAccountNumber}
              onChange={(e) => setRecipientAccountNumber(e.target.value)}
              placeholder="BR-1234567890"
              required
            />
            {lookupState === "found" && beneficiaryName && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-accent-green/30 bg-accent-green/10 px-3 py-2.5">
                <span className="text-xs text-text-muted shrink-0">
                  {t("withdrawals.memberTransfer.beneficiaryName")}:
                </span>
                <UserDisplayName
                  name={beneficiaryName}
                  verificationBadge={beneficiaryVerificationBadge}
                  badgeSize="sm"
                  nameClassName="text-sm font-semibold text-white"
                  className="min-w-0"
                />
              </div>
            )}
            {beneficiaryHint && (
              <p
                className={cn(
                  "text-xs mt-1.5",
                  lookupState === "loading" ? "text-text-muted" : "text-accent-red"
                )}
              >
                {beneficiaryHint}
              </p>
            )}
          </div>

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
              !recipientAccountNumber.trim() ||
              lookupState !== "found" ||
              !amountUsd ||
              (selectedAccount?.availableBalance ?? 0) <= 0
            }
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
    </>
  );
}
