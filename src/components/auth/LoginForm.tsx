"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, Mail, RefreshCw } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import type { LoginInput } from "@/lib/validations";
import { useI18n } from "@/components/providers/I18nProvider";
import { useValidationSchemas } from "@/lib/i18n/use-validation-schemas";

const VERIFY_EMAIL_ERROR = "Please verify your email before signing in.";
const RESEND_COOLDOWN = 60;

type VerifyMode =
  | { kind: "login"; email: string; password: string }
  | { kind: "manual"; email: string };

function LoginFormInner() {
  const { t } = useI18n();
  const schemas = useValidationSchemas();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const authError = searchParams.get("error");
  const authMessages: Record<string, string> = {
    sign_in_required: t("auth.signInRequired"),
    verify_email: t("auth.verifyEmailBanner"),
    Configuration: t("auth.configError"),
  };
  const bannerMessage = authError ? authMessages[authError] : null;
  const [redirecting, setRedirecting] = useState(false);
  const [authReady, setAuthReady] = useState(true);
  const [verifyMode, setVerifyMode] = useState<VerifyMode | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setAuthReady(Boolean(data?.auth?.configured)))
      .catch(() => setAuthReady(false));
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(schemas.loginSchema),
  });

  const sendVerificationCode = useCallback(async (email: string) => {
    const res = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), purpose: "verify" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("auth.resendFailed"));
    if (data.devOtp) setDevOtp(data.devOtp);
    setResendCooldown(RESEND_COOLDOWN);
    toast.success(t("auth.newCodeSent"));
  }, [t]);

  const completeSignIn = async (email: string, password: string) => {
    const destination =
      callbackUrl.startsWith("/dashboard") ? callbackUrl : "/dashboard";

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    void fetch("/api/auth/track-session", { method: "POST", credentials: "include" });
    setRedirecting(true);
    window.location.href = destination;
  };

  const handleVerifyOtp = async () => {
    if (!verifyMode || otp.length !== 6) return;
    setVerifyLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyMode.email.trim().toLowerCase(), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.verificationFailed"));

      if (verifyMode.kind === "login") {
        await completeSignIn(verifyMode.email, verifyMode.password);
        return;
      }

      toast.success(t("auth.emailVerifiedSignIn"));
      setVerifyMode(null);
      setOtp("");
      setDevOtp(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.verificationFailed"));
    } finally {
      setVerifyLoading(false);
    }
  };

  const startManualVerify = async () => {
    const email = manualEmail.trim().toLowerCase();
    if (!email) return;
    setVerifyLoading(true);
    try {
      await sendVerificationCode(email);
      setVerifyMode({ kind: "manual", email });
      setOtp("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.resendFailed"));
    } finally {
      setVerifyLoading(false);
    }
  };

  const onSubmit = async (data: LoginInput) => {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error === VERIFY_EMAIL_ERROR) {
      setVerifyMode({
        kind: "login",
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });
      setOtp("");
      setDevOtp(null);
      try {
        await sendVerificationCode(data.email);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("auth.resendFailed"));
      }
      return;
    }

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    await completeSignIn(data.email, data.password);
  };

  if (verifyMode) {
    return (
      <Card>
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-accent-brand/15 border border-accent-brand/30 flex items-center justify-center">
            <Mail size={28} className="text-accent-brand" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary text-center">{t("auth.verifyEmailTitle")}</h1>
        <p className="text-sm text-text-secondary text-center mt-2">
          {t("auth.verifyEmailSubtitle", { email: verifyMode.email })}
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
          <Button onClick={handleVerifyOtp} isLoading={verifyLoading || redirecting} className="w-full" disabled={otp.length !== 6}>
            {t("auth.verifyContinue")}
          </Button>
          <button
            type="button"
            onClick={() => sendVerificationCode(verifyMode.email).catch((err) => {
              toast.error(err instanceof Error ? err.message : t("auth.resendFailed"));
            })}
            disabled={resendCooldown > 0 || verifyLoading}
            className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-accent-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-2"
          >
            <RefreshCw size={14} />
            {resendCooldown > 0 ? t("auth.resendCodeIn", { seconds: resendCooldown }) : t("auth.resendCode")}
          </button>
          <button
            type="button"
            onClick={() => {
              setVerifyMode(null);
              setOtp("");
              setDevOtp(null);
            }}
            className="w-full text-sm text-text-muted hover:text-text-secondary py-2"
          >
            {t("auth.backToSignIn")}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-text-primary text-center">{t("auth.welcomeBack")}</h1>
      <p className="text-sm text-text-secondary text-center mt-2">{t("auth.signInSubtitle")}</p>

      {!authReady && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{t("auth.configError")}</p>
        </div>
      )}

      {bannerMessage && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-accent-gold/30 bg-accent-gold/10 p-3 text-sm text-accent-gold">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>{bannerMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <Input label={t("auth.email")} type="email" {...register("email")} error={errors.email?.message} placeholder="you@example.com" />
        <Input label={t("auth.password")} type="password" {...register("password")} error={errors.password?.message} placeholder="••••••••" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" {...register("remember")} className="rounded border-border accent-accent-gold" />
            {t("auth.rememberMe")}
          </label>
          <Link href="/forgot-password" className="text-sm text-accent-gold hover:text-accent-gold-light transition-colors shrink-0">
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting || redirecting} disabled={!authReady} className="w-full">
          {redirecting ? t("auth.openingDashboard") : t("auth.login")}
        </Button>
      </form>

      <div className="mt-4 rounded-xl border border-border bg-bg-tertiary/40 p-4 space-y-3">
        <p className="text-xs text-text-secondary">{t("auth.verifyEmailPrompt")}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={startManualVerify}
            isLoading={verifyLoading}
            disabled={!manualEmail.trim()}
            className="shrink-0"
          >
            {t("auth.sendVerifyCode")}
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="text-accent-gold hover:text-accent-gold-light transition-colors">{t("auth.openAccountLink")}</Link>
      </p>
    </Card>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
      <LoginFormInner />
    </Suspense>
  );
}
