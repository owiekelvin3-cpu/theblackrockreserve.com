"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Upload, Check, Mail, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  registerStep1Schema, registerStep2Schema,
  type RegisterStep1Input, type RegisterStep2Input,
} from "@/lib/validations";
import { useI18n } from "@/components/providers/I18nProvider";

type Step1Data = RegisterStep1Input;
type Step2Data = RegisterStep2Input;

const RESEND_COOLDOWN = 60;

export default function RegisterForm() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Data | null>(null);
  const [kycFiles, setKycFiles] = useState<{ front?: string; back?: string }>({});
  const [otp, setOtp] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const step1Form = useForm<Step1Data>({ resolver: zodResolver(registerStep1Schema) });
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: { accountType: "PERSONAL" },
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleStep1 = (data: Step1Data) => {
    setStep1Data(data);
    setStep(2);
  };

  const handleStep2 = (data: Step2Data) => {
    setStep2Data(data);
    setStep(3);
  };

  const handleFileUpload = (side: "front" | "back", file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setKycFiles((prev) => ({ ...prev, [side]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRegister = async () => {
    if (!step1Data || !step2Data) return;
    setIsLoading(true);

    try {
      const { confirmPassword, ...step2Payload } = step2Data;
      void confirmPassword;
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step1Data,
          ...step2Payload,
          kycIdFront: kycFiles.front,
          kycIdBack: kycFiles.back,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.registrationFailed"));

      setShowOtp(true);
      setResendCooldown(RESEND_COOLDOWN);
      if (data.devOtp) setDevOtp(data.devOtp);
      toast.success(data.message || t("auth.accountSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.registrationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = useCallback(async () => {
    if (!step1Data?.email || resendCooldown > 0) return;

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: step1Data.email, purpose: "verify" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.resendFailed"));
      if (data.devOtp) setDevOtp(data.devOtp);
      setResendCooldown(RESEND_COOLDOWN);
      toast.success(t("auth.newCodeSent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.resendFailed"));
    }
  }, [step1Data?.email, resendCooldown, t]);

  const handleVerifyOtp = async () => {
    if (!step1Data || !step2Data) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: step1Data.email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.verificationFailed"));

      const result = await signIn("credentials", {
        email: step1Data.email,
        password: step2Data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.success(t("auth.emailVerifiedSignIn"));
        window.location.href = "/login";
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.verificationFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (showOtp) {
    return (
      <Card>
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-accent-brand/15 border border-accent-brand/30 flex items-center justify-center">
            <Mail size={28} className="text-accent-brand" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary text-center">{t("auth.verifyEmailTitle")}</h1>
        <p className="text-sm text-text-secondary text-center mt-2">
          {t("auth.verifyEmailSubtitle", { email: step1Data?.email ?? "" })}
        </p>
        <p className="text-xs text-text-muted text-center mt-1">{t("auth.checkInbox")}</p>
        {devOtp && (
          <div className="mt-4 p-3 rounded-xl bg-accent-brand/10 border border-accent-brand/30 text-center">
            <p className="text-xs text-text-secondary mb-1">{t("auth.devOtpLabel")}</p>
            <p className="text-2xl font-mono font-bold text-accent-brand tracking-widest">{devOtp}</p>
          </div>
        )}
        <div className="mt-8 space-y-4">
          <Input
            label={t("auth.verificationCode")}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="text-center text-2xl tracking-[0.5em] font-mono"
          />
          <Button onClick={handleVerifyOtp} isLoading={isLoading} className="w-full" disabled={otp.length !== 6}>
            {t("auth.verifyContinue")}
          </Button>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resendCooldown > 0}
            className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-accent-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-2"
          >
            <RefreshCw size={14} />
            {resendCooldown > 0 ? t("auth.resendCodeIn", { seconds: resendCooldown }) : t("auth.resendCode")}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-text-primary text-center">{t("auth.createAccountTitle")}</h1>
      <p className="text-sm text-text-secondary text-center mt-2">{t("auth.createAccountSubtitle")}</p>

      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= s ? "bg-accent-gold text-bg-primary" : "bg-bg-tertiary text-text-muted"
            }`}>
              {step > s ? <Check size={16} /> : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-accent-gold" : "bg-bg-tertiary"}`} />}
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
        <form onSubmit={step2Form.handleSubmit(handleStep2)} className="mt-8 space-y-4">
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
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} className="flex-1">{t("auth.back")}</Button>
            <Button type="submit" className="flex-1">{t("auth.continue")}</Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-text-secondary">{t("auth.kycUploadDesc")}</p>
          {(["front", "back"] as const).map((side) => (
            <label key={side} className="block">
              <span className="text-sm font-medium text-text-secondary mb-2 block capitalize">
                {side === "front" ? t("auth.idFront") : t("auth.idBack")}
              </span>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent-gold/40 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(side, e.target.files[0])}
                />
                {kycFiles[side] ? (
                  <div className="flex items-center justify-center gap-2 text-accent-green">
                    <Check size={20} /> {t("auth.uploaded")}
                  </div>
                ) : (
                  <div className="text-text-muted">
                    <Upload size={24} className="mx-auto mb-2" />
                    <p className="text-sm">{t("auth.clickUpload")}</p>
                  </div>
                )}
              </div>
            </label>
          ))}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="flex-1">{t("auth.back")}</Button>
            <Button onClick={handleRegister} isLoading={isLoading} className="flex-1">{t("auth.createAccountBtn")}</Button>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="text-accent-gold hover:text-accent-gold-light transition-colors">{t("auth.login")}</Link>
      </p>
    </Card>
  );
}
