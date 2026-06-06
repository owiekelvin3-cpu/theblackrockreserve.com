import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
});

export const registerStep1Schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

export const registerStep2Schema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  confirmPassword: z.string(),
  accountType: z.enum(["PERSONAL", "BUSINESS"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const resendOtpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  purpose: z.enum(["verify", "reset"]),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const registerApiSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  accountType: z.enum(["PERSONAL", "BUSINESS"]),
  kycIdFront: z.string().optional(),
  kycIdBack: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;
export type RegisterStep2Input = z.infer<typeof registerStep2Schema>;
export type ContactInput = z.infer<typeof contactSchema>;

export const adminUserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  accountType: z.enum(["PERSONAL", "BUSINESS"]).optional(),
  kycStatus: z.enum(["PENDING", "SUBMITTED", "VERIFIED", "REJECTED"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
});

export const adminPasswordResetSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

export const balanceAdjustmentSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number().positive("Amount must be greater than zero"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
});

export const platformSettingsSchema = z.object({
  bitcoinWalletAddress: z.string().optional(),
  bitcoinPurchaseLink: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || /^https?:\/\/.+/.test(v), "Must be a valid URL"),
  depositInstructions: z.string().optional(),
  depositConfirmationMessage: z.string().optional(),
});

export const depositSubmitSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amountUsd: z.number().positive("Amount must be greater than zero").optional(),
  txHash: z.string().min(10, "Transaction reference must be at least 10 characters").optional().or(z.literal("")),
  proofNote: z.string().optional(),
});

/** @deprecated use depositSubmitSchema */
export const depositProofSchema = depositSubmitSchema;

export const depositReviewSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reviewNote: z.string().optional(),
    creditAmount: z.number().positive().optional(),
    accountId: z.string().optional(),
  })
  .refine((data) => data.status !== "REJECTED" || !!data.reviewNote?.trim(), {
    message: "Rejection reason is required",
    path: ["reviewNote"],
  });

export const withdrawalRequestSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  method: z.enum([
    "ACH",
    "WIRE",
    "ZELLE",
    "PAYPAL",
    "VENMO",
    "CASH_APP",
    "APPLE_PAY",
    "GOOGLE_PAY",
    "DEBIT_CARD",
    "CRYPTO_STABLECOIN",
    "PAPER_CHECK",
  ]),
  amountUsd: z.number().positive("Amount must be greater than zero"),
  destination: z.string().min(3, "Payout destination is required"),
  destinationExtra: z.string().optional(),
  note: z.string().optional(),
});

export const withdrawalReviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

