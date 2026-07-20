import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export const preferredCurrencySchema = z.enum(SUPPORTED_CURRENCIES);

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
  preferredCurrency: preferredCurrencySchema,
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

const passwordFieldSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordFieldSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
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
  preferredCurrency: preferredCurrencySchema,
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
  emailVerified: z.boolean().optional(),
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
  physicalCardOrdersEnabled: z.boolean().optional(),
  physicalCardRequireKyc: z.boolean().optional(),
  physicalCardRequireInvestment: z.boolean().optional(),
  physicalCardMinBalance: z.number().min(0).optional(),
  physicalCardRequirePhone: z.boolean().optional(),
  physicalCardRequireEmail: z.boolean().optional(),
});

export const physicalCardOrderSchema = z.object({
  cardTier: z.enum(["STANDARD", "PREMIUM", "BLACK_ELITE"]),
  recipientName: z.string().min(2, "Recipient name is required").max(120),
  phone: z.string().min(7, "Phone number is required").max(30),
  addressLine1: z.string().min(3, "Street address is required").max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2, "City is required").max(100),
  stateRegion: z.string().min(2, "State/region is required").max(100),
  postalCode: z.string().min(3, "Postal code is required").max(20),
  country: z.string().min(2, "Country is required").max(100),
  deliveryInstructions: z.string().max(500).optional(),
});

export const adminCardRequestUpdateSchema = z.object({
  status: z
    .enum([
      "PENDING_REVIEW",
      "UNDER_VERIFICATION",
      "APPROVED",
      "CARD_PRODUCTION",
      "SHIPPED",
      "DELIVERED",
      "REJECTED",
      "CANCELLED",
    ])
    .optional(),
  trackingNumber: z.string().max(100).optional(),
  shippingCarrier: z.string().max(100).optional(),
  estimatedDeliveryDate: z.string().optional(),
  rejectionReason: z.string().max(500).optional(),
  adminNote: z.string().max(1000).optional(),
  statusEtaDays: z.number().int().min(0).max(90).optional(),
  lastFour: z
    .string()
    .regex(/^\d{4}$/, "Last four digits must be exactly 4 numbers")
    .optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(new Date().getFullYear()).max(2099).optional(),
});

export const transactionPinSchema = z.preprocess(
  (val) =>
    typeof val === "number"
      ? String(val)
      : typeof val === "string"
        ? val.trim()
        : val,
  z
    .string({ error: "Transaction PIN must be 4 digits" })
    .regex(/^\d{4}$/, "Transaction PIN must be 4 digits")
);

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

export const profitWithdrawSchema = z.object({
  amount: z.number().positive("Amount must be greater than zero"),
  transactionPin: transactionPinSchema,
});

export const memberTransferSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  recipientAccountNumber: z
    .string()
    .min(8, "Recipient account number is required")
    .refine((v) => {
      const normalized = v.trim().toUpperCase();
      if (/^BR-\d{10}$/.test(normalized)) return true;
      const digits = normalized.replace(/\D/g, "");
      return digits.length === 10;
    }, "Enter a valid account number (e.g. BR-1234567890)"),
  amount: z.number().positive("Amount must be greater than zero"),
  note: z.string().max(200).optional(),
  transactionPin: transactionPinSchema,
});

/** Gold users — recipient name is free text, not validated against the database. */
export const memberTransferByNameSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  recipientName: z
    .string()
    .min(1, "Recipient name is required")
    .max(120, "Recipient name is too long")
    .refine((v) => v.trim().length > 0, "Recipient name is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  note: z.string().max(200).optional(),
  transactionPin: transactionPinSchema,
});

export const depositSubmitSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amountUsd: z.number().positive("Amount sent is required and must be greater than zero"),
  proofImage: z.string().min(1, "Transaction reference image is required"),
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
  amountUsd: z.coerce.number().positive("Amount must be greater than zero"),
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
  txHash: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .refine((v) => v == null || v.length >= 10, {
      message: "Transaction reference must be at least 10 characters when provided",
    }),
  proofNote: z.string().optional(),
  proofImage: z.string().min(1, "Payment screenshot is required"),
  paymentMethod: z.string().min(1).default("BITCOIN"),
  transactionPin: transactionPinSchema,
});

export const userProfitTaxSchema = z
  .object({
    userId: z.string().min(1, "User is required").optional(),
    applyToAll: z.boolean().optional(),
    percentage: z
      .number()
      .positive("Percentage must be greater than zero")
      .max(100, "Percentage cannot exceed 100"),
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
  });

export const profitTaxPaymentSubmitSchema = z.object({
  txHash: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .refine((v) => v == null || v.length >= 10, {
      message: "Transaction reference must be at least 10 characters when provided",
    }),
  proofNote: z.string().optional(),
  proofImage: z.string().min(1, "Payment screenshot is required"),
  paymentMethod: z.string().min(1).default("BITCOIN"),
  transactionPin: transactionPinSchema,
});

export const profitTaxPayFromBalanceSchema = z.object({
  transactionPin: transactionPinSchema,
});

export const profitTaxPaymentReviewSchema = z
  .object({
    status: z.enum(["PAID", "REJECTED"]),
    reviewNote: z.string().optional(),
  })
  .refine((data) => data.status !== "REJECTED" || !!data.reviewNote?.trim(), {
    message: "Rejection reason is required",
    path: ["reviewNote"],
  });

export const investSubmitSchema = z.object({
  symbol: z.string().min(1, "Select an asset to buy").max(12, "Invalid symbol"),
  amountUsd: z.coerce
    .number({ error: "Enter a valid amount" })
    .positive("Amount must be greater than zero")
    .max(10_000_000, "Amount is too large"),
  accountId: z.string().optional(),
  idempotencyKey: z.string().max(64).optional(),
  transactionPin: transactionPinSchema,
});

export const sellSubmitSchema = z
  .object({
    symbol: z.string().min(1, "Select an asset to sell").max(12, "Invalid symbol"),
    shares: z.coerce
      .number({ error: "Enter a valid number of shares" })
      .positive("Share amount must be greater than zero")
      .max(1_000_000_000, "Share amount is too large")
      .optional(),
    amountUsd: z.coerce
      .number({ error: "Enter a valid sale amount" })
      .positive("Sale amount must be greater than zero")
      .max(10_000_000, "Sale amount is too large")
      .optional(),
    accountId: z.string().optional(),
    transactionPin: transactionPinSchema,
  })
  .refine((data) => data.shares != null || data.amountUsd != null, {
    message: "Enter shares or a sale amount",
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

export const accountFreezeSchema = z.object({
  freezeType: z.enum(["FULL", "WITHDRAWAL_ONLY"]),
  reason: z.string().min(3, "Freeze reason must be at least 3 characters").max(2000),
  internalNotes: z.string().max(5000).optional(),
});

export const accountFreezeUpdateSchema = z.object({
  reason: z.string().min(3, "Freeze reason must be at least 3 characters").max(2000),
  internalNotes: z.string().max(5000).optional(),
});

export const fundReleaseReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminNotes: z.string().max(5000).optional(),
});
