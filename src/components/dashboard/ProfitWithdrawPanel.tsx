"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/I18nProvider";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import { cn } from "@/lib/utils";

const QUICK_FRACTIONS = [0.25, 0.5, 0.75] as const;

interface ProfitWithdrawPanelProps {
  profitBalance: number;
  onSuccess: () => void;
  /** Omit outer divider when shown inside a modal */
  embedded?: boolean;
}

function sanitizeAmountInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

function formatAmountDigits(value: string): string {
  if (!value) return "";
  const [whole, fraction = ""] = value.split(".");
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${formattedWhole}.${fraction}` : formattedWhole;
}

export default function ProfitWithdrawPanel({
  profitBalance,
  onSuccess,
  embedded = false,
}: ProfitWithdrawPanelProps) {
  const router = useRouter();
  const { t, formatCurrency } = useI18n();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } =
    useTransactionPin();

  const parsedAmount = Number.parseFloat(amount);
  const maxAmount = profitBalance;
  const formattedAvailable = formatCurrency(maxAmount);
  const availableIsLarge = formattedAvailable.length > 12;

  const quickOptions = useMemo(
    () =>
      [
        ...QUICK_FRACTIONS.map((fraction) => ({
          key: `fraction-${fraction}`,
          label: `${Math.round(fraction * 100)}%`,
          value: Math.round(maxAmount * fraction * 100) / 100,
        })),
        {
          key: "all",
          label: t("investments.profitWithdrawAll"),
          value: maxAmount,
        },
      ].filter((option) => option.value > 0),
    [maxAmount, t]
  );

  const submit = async (value?: number) => {
    const withdrawAmount = value ?? parsedAmount;
    if (!Number.isFinite(withdrawAmount) || withdrawAmount <= 0) {
      toast.error(t("investments.profitWithdrawInvalidAmount"));
      return;
    }
    if (withdrawAmount > maxAmount) {
      toast.error(t("investments.profitWithdrawExceedsBalance"));
      return;
    }

    requestPin(async (transactionPin) => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/profit/withdraw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: withdrawAmount, transactionPin }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || t("investments.profitWithdrawFailed"));

        setAmount("");
        onSuccess();

        if (json.requiresTaxPayment && json.taxPaymentUrl) {
          toast.success(json.message || t("investments.profitTax.redirecting"));
          router.push(json.taxPaymentUrl);
          return;
        }

        toast.success(
          t("investments.profitWithdrawSuccess", {
            amount: formatCurrency(withdrawAmount),
          })
        );
      } catch (err) {
        throw err instanceof Error ? err : new Error(t("investments.profitWithdrawFailed"));
      } finally {
        setLoading(false);
      }
    });
  };

  if (maxAmount <= 0) return null;

  const displayAmount = formatAmountDigits(amount);
  const showPreview = parsedAmount > 0 && Number.isFinite(parsedAmount);

  return (
    <div className={embedded ? "space-y-0" : "mt-4 pt-4 border-t border-white/10 space-y-3"}>
      {!embedded && (
        <div className="flex items-start gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center shrink-0">
            <ArrowDownToLine size={15} className="text-accent-green" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{t("investments.profitWithdrawTitle")}</p>
            <p className="text-xs text-text-muted mt-0.5">{t("investments.profitWithdrawDesc")}</p>
          </div>
        </div>
      )}

      {embedded && (
        <div className="profit-withdraw-balance-card">
          <p className="profit-withdraw-balance-label">{t("investments.profitBalance")}</p>
          <p className={cn("profit-withdraw-balance-value", availableIsLarge && "is-compact")}>
            {formattedAvailable}
          </p>
        </div>
      )}

      <div className="profit-withdraw-amount-wrap">
        <label htmlFor="profit-withdraw-amount" className="profit-withdraw-amount-label">
          {t("investments.profitWithdrawAmountLabel")}
        </label>
        <div className="profit-withdraw-amount-field-wrap">
          <span className="profit-withdraw-amount-prefix" aria-hidden>
            $
          </span>
          <input
            id="profit-withdraw-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={displayAmount}
            data-length={amount.replace(/\D/g, "").length || undefined}
            onChange={(e) => {
              const raw = sanitizeAmountInput(e.target.value.replace(/,/g, ""));
              setAmount(raw);
            }}
            placeholder="0.00"
            aria-label={t("investments.profitWithdrawAmountLabel")}
            className="profit-withdraw-amount-field"
          />
        </div>
        {showPreview && (
          <p className="profit-withdraw-amount-preview">
            {t("investments.profitWithdrawPreview")}{" "}
            <strong>{formatCurrency(parsedAmount)}</strong>
          </p>
        )}
      </div>

      <div className="profit-withdraw-chips" role="group" aria-label={t("investments.profitWithdrawQuickAmounts")}>
        {quickOptions.map((option) => {
          const isActive = amount !== "" && Math.abs(parsedAmount - option.value) < 0.005;
          const chipLabel = `${option.label} · ${formatCurrency(option.value)}`;

          return (
            <button
              key={option.key}
              type="button"
              title={formatCurrency(option.value)}
              onClick={() => setAmount(String(option.value))}
              className={cn("profit-withdraw-chip", isActive && "is-active")}
            >
              <span className="profit-withdraw-chip-label">{chipLabel}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={loading || pinLoading}
        onClick={() => submit()}
        className="profit-withdraw-submit"
      >
        <ArrowDownToLine size={16} />
        {loading || pinLoading ? t("common.processing") : t("investments.profitWithdrawCta")}
      </button>

      <TransactionPinModal
        open={pinOpen}
        onClose={closePin}
        onConfirm={confirmPin}
        loading={pinLoading || loading}
        error={pinError}
      />
    </div>
  );
}
