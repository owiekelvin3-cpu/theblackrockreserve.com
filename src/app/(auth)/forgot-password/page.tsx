"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations";
import type { z } from "zod";

type ResetForm = z.infer<typeof resetPasswordSchema>;
const RESEND_COOLDOWN = 60;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const emailForm = useForm({ resolver: zodResolver(forgotPasswordSchema) });
  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "", otp: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const sendCode = async (targetEmail: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send code");
  };

  const onEmailSubmit = async (data: { email: string }) => {
    try {
      await sendCode(data.email);
      setEmail(data.email);
      resetForm.setValue("email", data.email);
      setStep("reset");
      setResendCooldown(RESEND_COOLDOWN);
      toast.success("Check your email for a reset code.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleResend = useCallback(async () => {
    if (!email || resendCooldown > 0) return;
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      setResendCooldown(RESEND_COOLDOWN);
      toast.success("New code sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    }
  }, [email, resendCooldown]);

  const onResetSubmit = async (data: ResetForm) => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reset failed");
      setStep("done");
      toast.success("Password updated!");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    }
  };

  if (step === "done") {
    return (
      <Card>
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto text-accent-green mb-4" />
          <h1 className="font-display text-2xl font-bold text-text-primary">Password Updated</h1>
          <p className="text-sm text-text-secondary mt-2">Redirecting you to sign in...</p>
        </div>
      </Card>
    );
  }

  if (step === "reset") {
    return (
      <Card>
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-2xl bg-accent-brand/15 border border-accent-brand/30 flex items-center justify-center">
            <Mail size={28} className="text-accent-brand" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary text-center">Reset Password</h1>
        <p className="text-sm text-text-secondary text-center mt-2">
          Enter the code sent to <span className="text-white font-medium">{email}</span>
        </p>
        <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="mt-8 space-y-4">
          <input type="hidden" {...resetForm.register("email")} />
          <Input
            label="Verification Code"
            {...resetForm.register("otp")}
            error={resetForm.formState.errors.otp?.message}
            placeholder="000000"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <Input
            label="New Password"
            type="password"
            {...resetForm.register("password")}
            error={resetForm.formState.errors.password?.message}
            placeholder="••••••••"
          />
          <Input
            label="Confirm Password"
            type="password"
            {...resetForm.register("confirmPassword")}
            error={resetForm.formState.errors.confirmPassword?.message}
            placeholder="••••••••"
          />
          <Button type="submit" isLoading={resetForm.formState.isSubmitting} className="w-full">
            Update Password
          </Button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="w-full flex items-center justify-center gap-2 text-sm text-text-secondary hover:text-accent-gold transition-colors disabled:opacity-50 py-2"
          >
            <RefreshCw size={14} />
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">
          <button type="button" onClick={() => setStep("email")} className="text-accent-gold hover:text-accent-gold-light">
            Use a different email
          </button>
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-text-primary text-center">Forgot Password</h1>
      <p className="text-sm text-text-secondary text-center mt-2">
        Enter your email and we&apos;ll send a verification code
      </p>
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="mt-8 space-y-4">
        <Input label="Email" type="email" {...emailForm.register("email")} error={emailForm.formState.errors.email?.message} placeholder="you@example.com" />
        <Button type="submit" isLoading={emailForm.formState.isSubmitting} className="w-full">Send Reset Code</Button>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent-gold hover:text-accent-gold-light transition-colors">Back to Sign In</Link>
      </p>
    </Card>
  );
}
