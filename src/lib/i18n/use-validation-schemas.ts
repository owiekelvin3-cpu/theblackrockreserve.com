"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useI18n } from "@/components/providers/I18nProvider";
import { preferredCurrencySchema } from "@/lib/validations";

export function useValidationSchemas() {
  const { t } = useI18n();

  return useMemo(() => {
    const email = z.string().email(t("validation.emailInvalid"));
    const password = z
      .string()
      .min(8, t("validation.passwordMin"))
      .regex(/[A-Z]/, t("validation.passwordUppercase"))
      .regex(/[0-9]/, t("validation.passwordNumber"));

    return {
      loginSchema: z.object({
        email,
        password: z.string().min(8, t("validation.passwordMin")),
        remember: z.boolean().optional(),
      }),
      registerStep1Schema: z.object({
        fullName: z.string().min(2, t("validation.fullNameRequired")),
        email,
        phone: z.string().min(10, t("validation.phoneInvalid")),
        dateOfBirth: z.string().min(1, t("validation.dobRequired")),
      }),
      registerStep2Schema: z
        .object({
          password,
          confirmPassword: z.string(),
          accountType: z.enum(["PERSONAL", "BUSINESS"]),
          preferredCurrency: preferredCurrencySchema,
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("validation.passwordsMismatch"),
          path: ["confirmPassword"],
        }),
      forgotPasswordSchema: z.object({ email }),
      contactSchema: z.object({
        name: z.string().min(2, t("validation.nameRequired")),
        email,
        subject: z.string().min(3, t("validation.subjectRequired")),
        message: z.string().min(10, t("validation.messageMin")),
      }),
      verifyOtpSchema: z.object({
        email: z.string().email(),
        otp: z.string().length(6, t("validation.otpLength")),
      }),
      resendOtpSchema: z.object({
        email,
        purpose: z.enum(["verify", "reset"]),
      }),
      resetPasswordSchema: z
        .object({
          email,
          otp: z.string().length(6, t("validation.otpLength")),
          password,
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("validation.passwordsMismatch"),
          path: ["confirmPassword"],
        }),
    };
  }, [t]);
}
