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

const contactFaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

export const platformSettingsSchema = z.object({
  bitcoinWalletAddress: z.string().optional(),
  bitcoinPurchaseLink: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || /^https?:\/\/.+/.test(v), "Must be a valid URL"),
  depositInstructions: z.string().optional(),
  depositConfirmationMessage: z.string().optional(),
  contactEmail: z
    .string()
    .optional()
    .refine((v) => !v || v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Must be a valid email"),
  contactPhone: z.string().optional(),
  contactAddressLine1: z.string().optional(),
  contactAddressLine2: z.string().optional(),
  contactHqTitle: z.string().optional(),
  contactHqAddress: z.string().optional(),
  contactFaqs: z.array(contactFaqSchema).optional(),
});

export const transactionPinSchema = z
  .string()
  .length(4, "Transaction PIN must be 4 digits")
  .regex(/^\d{4}$/, "Transaction PIN must be 4 digits");

export const setTransactionPinSchema = z
  .object({
    password: z.string().min(1, "Login password is required"),
    pin: transactionPinSchema,
    confirmPin: transactionPinSchema,
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  });

export const changeTransactionPinSchema = z
  .object({
    currentPin: transactionPinSchema,
    newPin: transactionPinSchema,
    confirmPin: transactionPinSchema,
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "PINs do not match",
    path: ["confirmPin"],
  })
  .refine((data) => data.currentPin !== data.newPin, {
    message: "New PIN must be different from current PIN",
    path: ["newPin"],
  });

export const savingsTransferSchema = z.object({
  direction: z.enum(["to-savings", "to-checking"]),
  amount: z.number().positive("Amount must be greater than zero"),
  transactionPin: transactionPinSchema,
});

export const depositSubmitSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amountUsd: z.number().positive("Amount must be greater than zero").optional(),
  txHash: z.string().min(10, "Transaction reference must be at least 10 characters").optional().or(z.literal("")),
  proofNote: z.string().optional(),
  transactionPin: transactionPinSchema,
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
  chargeAcknowledged: z.boolean().optional(),
  transactionPin: transactionPinSchema,
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

export const userWithdrawalChargeSchema = z
  .object({
    userId: z.string().min(1, "User is required").optional(),
    applyToAll: z.boolean().optional(),
    chargeType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    amountUsd: z.number().positive("Charge amount must be greater than zero").optional(),
    percentage: z
      .number()
      .positive("Percentage must be greater than zero")
      .max(100, "Percentage cannot exceed 100")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.applyToAll) return;

    if (!data.userId) {
      ctx.addIssue({
        code: "custom",
        message: "User is required",
        path: ["userId"],
      });
    }

    if (data.chargeType === "FIXED" && data.amountUsd == null) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed charge amount is required",
        path: ["amountUsd"],
      });
    }

    if (data.chargeType === "PERCENTAGE" && data.percentage == null) {
      ctx.addIssue({
        code: "custom",
        message: "Percentage is required",
        path: ["percentage"],
      });
    }
  })
  .superRefine((data, ctx) => {
    if (!data.applyToAll) return;

    if (data.chargeType === "FIXED" && data.amountUsd == null) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed charge amount is required",
        path: ["amountUsd"],
      });
    }

    if (data.chargeType === "PERCENTAGE" && data.percentage == null) {
      ctx.addIssue({
        code: "custom",
        message: "Percentage is required",
        path: ["percentage"],
      });
    }
  });

export const withdrawalChargePaymentSubmitSchema = z.object({
  txHash: z.string().min(10, "Transaction reference must be at least 10 characters").optional().or(z.literal("")),
  proofNote: z.string().optional(),
  paymentMethod: z.string().min(1).default("BITCOIN"),
  transactionPin: transactionPinSchema,
});

export const investSubmitSchema = z.object({
  symbol: z.string().min(1).max(12),
  amountUsd: z.coerce.number().positive().max(10_000_000),
  accountId: z.string().optional(),
  idempotencyKey: z.string().max(64).optional(),
  transactionPin: transactionPinSchema,
});

export const jointMoneyActionSchema = z.object({
  amount: z.coerce.number().positive().max(10_000_000),
  personalAccountId: z.string().optional(),
  transactionPin: transactionPinSchema,
});

export const jointInvestSchema = z.object({
  symbol: z.string().min(1).max(12),
  amountUsd: z.coerce.number().positive().max(10_000_000),
  transactionPin: transactionPinSchema,
});

export const jointApprovalActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  transactionPin: transactionPinSchema.optional(),
});

export const withdrawalChargePaymentReviewSchema = z
  .object({
    status: z.enum(["PAID", "REJECTED", "UNPAID"]),
    reviewNote: z.string().optional(),
  })
  .refine((data) => data.status !== "REJECTED" || !!data.reviewNote?.trim(), {
    message: "Rejection reason is required",
    path: ["reviewNote"],
  });

const ssnSchema = z
  .string()
  .min(9, "SSN must be 9 digits")
  .max(11)
  .refine((v) => /^\d{3}-?\d{2}-?\d{4}$/.test(v.replace(/\s/g, "")), "Invalid SSN format");

const routingSchema = z.string().regex(/^\d{9}$/, "Routing number must be 9 digits");

export const taxRefundVerificationSchema = z.object({
  fullLegalName: z.string().min(2, "Full legal name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  ssn: ssnSchema,
  phone: z.string().min(7, "Phone number is required"),
  email: z.string().email("Valid email is required"),
  residentialAddress: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "ZIP code is required"),
  employerName: z.string().min(2, "Employer name is required"),
  employerAddress: z.string().min(5, "Employer address is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  annualIncome: z.number().positive("Annual income must be positive"),
  employmentStartDate: z.string().min(1, "Employment start date is required"),
  taxFilingStatus: z.string().min(1, "Tax filing status is required"),
  taxYear: z.string().min(4, "Tax year is required"),
  adjustedGrossIncome: z.number().min(0),
  federalTaxPaid: z.number().min(0),
  taxRefundAmountExpected: z.number().min(0),
  tin: z.string().min(9, "TIN is required"),
  irsFilingConfirmationNumber: z.string().min(4, "IRS confirmation number is required"),
  bankName: z.string().min(2, "Bank name is required"),
  accountHolderName: z.string().min(2, "Account holder name is required"),
  accountNumber: z.string().min(4, "Account number is required"),
  routingNumber: routingSchema,
  governmentId: z.string().optional(),
  taxReturnDocument: z.string().optional(),
  w2Form: z.string().optional(),
  proofOfAddress: z.string().optional(),
  declarationAccepted: z.boolean().refine((v) => v === true, {
    message: "You must certify that all information is accurate",
  }),
});

export const loanApplicationSchema = z.object({
  productId: z.string().min(1, "Loan product is required"),
  requestedAmount: z.number().positive("Loan amount must be positive"),
  loanPurpose: z.string().min(10, "Please describe your loan purpose"),
  monthlyIncome: z.number().positive("Monthly income is required"),
  employmentStatus: z.string().min(2, "Employment status is required"),
  supportingDocuments: z.string().optional(),
});

export const taxRefundReviewSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED", "DOCUMENTS_REQUESTED"]),
    reviewNote: z.string().optional(),
    adminNotes: z.string().optional(),
  })
  .refine(
    (d) => d.status === "APPROVED" || !!d.reviewNote?.trim(),
    { message: "Review note is required for rejection or document requests", path: ["reviewNote"] }
  );

export const loanApplicationReviewSchema = z
  .object({
    status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "DISBURSED"]),
    reviewNote: z.string().optional(),
    adminNotes: z.string().optional(),
    approvedAmount: z.number().positive().optional(),
    interestRatePercent: z.number().positive().optional(),
    repaymentMonths: z.number().int().positive().optional(),
  })
  .refine((d) => d.status !== "REJECTED" || !!d.reviewNote?.trim(), {
    message: "Rejection reason is required",
    path: ["reviewNote"],
  })
  .refine(
    (d) =>
      d.status !== "APPROVED" ||
      (d.approvedAmount != null && d.interestRatePercent != null && d.repaymentMonths != null),
    { message: "Approved amount, interest rate, and repayment duration are required for approval", path: ["approvedAmount"] }
  );

