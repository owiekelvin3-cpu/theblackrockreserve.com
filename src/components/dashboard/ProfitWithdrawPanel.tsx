"use client";

import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/providers/I18nProvider";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";

const QUICK_FRACTIONS = [0.25, 0.5, 0.75] as const;

interface ProfitWithdrawPanelProps {
  profitBalance: number;
  onSuccess: () => void;
}

export default function ProfitWithdrawPanel({ profitBalance, onSuccess }: ProfitWithdrawPanelProps) {
  const { t, formatCurrency } = useI18n();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } =
    useTransactionPin();

  const parsedAmount = Number.parseFloat(amount);
  const maxAmount = profitBalance;

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

        onSuccess();
        setAmount("");
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

  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center shrink-0">
          <ArrowDownToLine size={15} className="text-accent-green" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{t("investments.profitWithdrawTitle")}</p>
          <p className="text-xs text-text-muted mt-0.5">{t("investments.profitWithdrawDesc")}</p>
        </div>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
        <input
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          max={maxAmount}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          aria-label={t("investments.profitWithdrawAmountLabel")}
          className="dash-table-search w-full pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green/40"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FRACTIONS.map((fraction) => {
          const value = Math.round(maxAmount * fraction * 100) / 100;
          if (value <= 0) return null;
          return (
            <button
              key={fraction}
              type="button"
              onClick={() => setAmount(String(value))}
              className="dash-control-btn text-xs py-1.5"
            >
              {Math.round(fraction * 100)}%
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAmount(String(maxAmount))}
          className="dash-control-btn text-xs py-1.5"
        >
          {t("investments.profitWithdrawAll")}
        </button>
      </div>

      <button
        type="button"
        disabled={loading || pinLoading}
        onClick={() => submit()}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-accent-green hover:bg-accent-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
