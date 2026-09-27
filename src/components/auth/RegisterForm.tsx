"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import type { RegisterStep1Input, RegisterStep2Input } from "@/lib/validations";
import { useI18n } from "@/components/providers/I18nProvider";
import { STANDARD_CURRENCY_OPTIONS } from "@/lib/currency";
import { useValidationSchemas } from "@/lib/i18n/use-validation-schemas";
import { waitForSessionRole } from "@/lib/auth-session-client";
import { destinationAfterCustomerAuth } from "@/lib/kyc-client";

type Step1Data = RegisterStep1Input;
type Step2Data = RegisterStep2Input;

export default function RegisterForm() {
  const { t } = useI18n();
  const schemas = useValidationSchemas();
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const step1Form = useForm<Step1Data>({ resolver: zodResolver(schemas.registerStep1Schema) });
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(schemas.registerStep2Schema),
    defaultValues: { accountType: "PERSONAL", preferredCurrency: "USD" },
  });

  const handleStep1 = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleRegister = async (data: Step2Data) => {
    if (!step1Data) return;
    setIsLoading(true);

    try {
      const { confirmPassword, ...step2Payload } = data;
      void confirmPassword;
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step1Data,
          ...step2Payload,
        }),
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || t("auth.registrationFailed"));

      const result = await signIn("credentials", {
        email: step1Data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.success(t("auth.accountSaved"));
        window.location.assign("/login");
        return;
      }

      toast.success(payload.message || t("auth.accountCreatedKyc"));
      await waitForSessionRole("USER");
      window.location.assign(await destinationAfterCustomerAuth("/kyc"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.registrationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-text-primary text-center">{t("auth.createAccountTitle")}</h1>
      <p className="text-sm text-text-secondary text-center mt-2">{t("auth.createAccountSubtitle")}</p>

      <div className="mt-6 flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= s ? "bg-accent-gold text-bg-primary" : "bg-bg-tertiary text-text-muted"
            }`}>
              {step > s ? <Check size={16} /> : s}
            </div>
            {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-accent-gold" : "bg-bg-tertiary"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={step1Form.handleSubmit(handleStep1)} className="mt-8 space-y-4">
          <Input label={t("auth.fullName")} {...step1Form.register("fullName")} error={step1Form.formState.errors.fullName?.message} />
          <Input label={t("auth.email")} type="email" {...step1Form.register("email")} error={step1Form.formState.errors.email?.message} />
          <Input label={t("auth.phone")} type="tel" {...step1Form.register("phone")} error={step1Form.formState.errors.phone?.message} />
          <Input label={t("auth.dateOfBirth")} type="date" {...step1Form.register("dateOfBirth")} error={step1Form.formState.errors.dateOfBirth?.message} />
          <Button type="submit" className="w-full">{t("auth.continue")}</Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={step2Form.handleSubmit(handleRegister)} className="mt-8 space-y-4">
          <Input label={t("auth.password")} type="password" {...step2Form.register("password")} error={step2Form.formState.errors.password?.message} />
          <Input label={t("auth.confirmPassword")} type="password" {...step2Form.register("confirmPassword")} error={step2Form.formState.errors.confirmPassword?.message} />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">{t("auth.accountType")}</label>
            <div className="flex gap-3">
              {(["PERSONAL", "BUSINESS"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => step2Form.setValue("accountType", type)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                    step2Form.watch("accountType") === type
                      ? "bg-accent-gold/20 text-accent-gold border border-accent-gold/40"
                      : "bg-bg-tertiary text-text-secondary border border-border"
                  }`}
                >
                  {type === "PERSONAL" ? t("auth.personal") : t("auth.business")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="preferredCurrency" className="block text-sm font-medium text-text-secondary mb-2">
              {t("auth.preferredCurrency")}
            </label>
            <select
              id="preferredCurrency"
              {...step2Form.register("preferredCurrency")}
              className="w-full rounded-xl border border-border bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-gold/40"
            >
              {STANDARD_CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-text-muted">{t("auth.preferredCurrencyDesc")}</p>
            {step2Form.formState.errors.preferredCurrency?.message && (
              <p className="mt-1 text-xs text-accent-red">{step2Form.formState.errors.preferredCurrency.message}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1">{t("auth.back")}</Button>
            <Button type="submit" isLoading={isLoading} className="flex-1">{t("auth.createAccountBtn")}</Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="text-accent-gold hover:text-accent-gold-light transition-colors">{t("auth.login")}</Link>
      </p>
    </Card>
  );
}
