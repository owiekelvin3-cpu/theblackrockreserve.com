"use client";

import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";

type CurrencyAmountInputProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  min?: string;
  step?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/** Amount field labeled and prefixed for the user's preferred display currency. */
export default function CurrencyAmountInput({
  value,
  onChange,
  id = "amount",
  required,
  min = "0.01",
  step = "0.01",
  placeholder = "0.00",
  className,
  disabled,
}: CurrencyAmountInputProps) {
  const { t, preferredCurrency, currencySymbol } = useI18n();
  const label = `${t("common.amount")} (${preferredCurrency})`;

  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none">
          {currencySymbol}
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          required={required}
          disabled={disabled}
          className="w-full rounded-xl border border-border bg-surface-overlay pl-9 pr-4 py-3 text-text-primary placeholder:text-text-muted transition-colors focus:border-accent-brand focus:outline-none focus:ring-1 focus:ring-accent-brand/30"
        />
      </div>
    </div>
  );
}
