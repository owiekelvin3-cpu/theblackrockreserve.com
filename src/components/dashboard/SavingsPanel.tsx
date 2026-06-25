"use client";

import { useState } from "react";
import { PiggyBank, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import SavingsApyBadge from "@/components/dashboard/SavingsApyBadge";
import { useTransactionPin } from "@/hooks/use-transaction-pin";

export interface SavingsData {
  checking: {
    id: string;
    name: string;
    currency: string;
    balance: number;
    flag: string;
  };
  savings: {
    id: string;
    name: string;
    currency: string;
    balance: number;
    flag: string;
  };
  availableToSave: number;
  savingsBalance: number;
  apyAnnualPercent: number;
  projectedAnnualYield: number;
}

const QUICK_AMOUNTS = [100, 500, 1000] as const;

interface SavingsPanelProps {
  data: SavingsData;
  onUpdated: () => void;
}

export default function SavingsPanel({ data, onUpdated }: SavingsPanelProps) {
  const { t, formatCurrency, currencySymbol } = useI18n();
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"to-savings" | "to-checking">("to-savings");
  const [loading, setLoading] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } = useTransactionPin();

  const parsedAmount = Number.parseFloat(amount);
  const maxAmount = direction === "to-savings" ? data.availableToSave : data.savingsBalance;

  const submit = async (value?: number) => {
    const transferAmount = value ?? parsedAmount;
    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (transferAmount > maxAmount) {
      toast.error(
        direction === "to-savings"
          ? "Amount exceeds your checking balance"
          : "Amount exceeds your savings balance"
      );
      return;
    }

    requestPin(async (transactionPin) => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/savings/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, amount: transferAmount, transactionPin }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Transfer failed");

        onUpdated();
        setAmount("");
        toast.success(
          direction === "to-savings"
            ? `${formatCurrency(transferAmount)} moved to savings`
            : `${formatCurrency(transferAmount)} moved to checking`
        );
      } catch (err) {
        throw err instanceof Error ? err : new Error("Transfer failed");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="dash-panel dash-savings-panel p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[0.9375rem] sm:text-base font-semibold text-text-primary">
              {t("dashboard.highYieldSavings")}
            </h2>
            <SavingsApyBadge rate={data.apyAnnualPercent} size="sm" />
          </div>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">{t("dashboard.savingsApyDesc")}</p>
        </div>
        <div className="dash-period-toggle self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setDirection("to-savings")}
            className={cn("dash-period-btn text-xs", direction === "to-savings" && "dash-period-btn-active")}
          >
            {t("dashboard.save")}
          </button>
          <button
            type="button"
            onClick={() => setDirection("to-checking")}
            className={cn("dash-period-btn text-xs", direction === "to-checking" && "dash-period-btn-active")}
            disabled={data.savingsBalance <= 0}
          >
            {t("dashboard.withdrawSavings")}
          </button>
        </div>
      </div>

      <div className="dash-wallet-tile dash-savings-wallet p-4 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-2xl leading-none">{data.savings.flag}</span>
          <SavingsApyBadge rate={data.apyAnnualPercent} />
        </div>
        <p className="text-xs text-text-muted font-medium uppercase tracking-wide">{data.savings.currency}</p>
        <p className="text-2xl sm:text-3xl font-bold text-text-primary mt-0.5 tracking-tight">
          {formatCurrency(data.savings.balance, data.savings.currency)}
        </p>
        <p className="text-[10px] text-text-muted mt-2 truncate">{data.savings.name}</p>
        {data.savings.balance > 0 && (
          <p className="dash-savings-yield-estimate mt-3">
            {t("dashboard.savingsProjectedYield", {
              amount: formatCurrency(data.projectedAnnualYield, data.savings.currency),
            })}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent-brand/10 border border-accent-brand/20 flex items-center justify-center shrink-0">
            <PiggyBank size={16} className="text-accent-brand" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-muted">
              {direction === "to-savings" ? t("dashboard.availableFromChecking") : t("dashboard.availableInSavings")}
            </p>
            <p className="text-sm font-semibold text-text-primary mt-0.5">
              {formatCurrency(maxAmount)}
            </p>
            <p className="text-[10px] text-text-muted mt-1 truncate">{data.checking.name}</p>
          </div>
        </div>

        <div>
          <label htmlFor="savings-amount" className="sr-only">
            Amount to {direction === "to-savings" ? "save" : "withdraw"}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">{currencySymbol}</span>
            <input
              id="savings-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              max={maxAmount > 0 ? maxAmount : undefined}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="dash-table-search w-full pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-brand/40"
            />
          </div>
        </div>

        {direction === "to-savings" && maxAmount > 0 && (
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.filter((v) => v <= maxAmount).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="dash-control-btn text-xs py-1.5"
              >
                {formatCurrency(v)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(String(maxAmount))}
              className="dash-control-btn text-xs py-1.5"
            >
              {t("dashboard.saveAll")}
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={loading || pinLoading || maxAmount <= 0}
          onClick={() => submit()}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white brand-gradient-bg shadow-brand disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowRightLeft size={16} />
          {loading
            ? t("common.processing")
            : direction === "to-savings"
              ? t("dashboard.saveToSavings")
              : t("dashboard.moveToChecking")}
        </button>
      </div>

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
