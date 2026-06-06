export type ChatSuggestion = {
  label: string;
  value: string;
};

export type ChatReply = {
  message: string;
  suggestions?: ChatSuggestion[];
};

const QUICK_START: ChatSuggestion[] = [
  { label: "Open an account", value: "How do I open an account?" },
  { label: "Bitcoin deposits", value: "How do Bitcoin deposits work?" },
  { label: "Withdraw funds", value: "How do withdrawals work?" },
  { label: "KYC verification", value: "What is the KYC process?" },
  { label: "Talk to support", value: "I need to speak with support" },
];

function normalize(text: string) {
  return text.toLowerCase().trim();
}

export function getWelcomeMessage(): ChatReply {
  return {
    message:
      "Hi! I'm Crest Assistant, your Platinum Crest Bank guide. I can help with accounts, deposits, withdrawals, transfers, KYC, and security. What would you like to know?",
    suggestions: QUICK_START,
  };
}

export function getChatReply(input: string): ChatReply {
  const q = normalize(input);

  if (!q) {
    return { message: "Please type a message or choose one of the options below.", suggestions: QUICK_START };
  }

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(q) || q === "help") {
    return {
      message:
        "Hello! Welcome to Platinum Crest Bank. I can walk you through registration, funding your account, transfers, and more.",
      suggestions: QUICK_START,
    };
  }

  if (q.includes("open") && (q.includes("account") || q.includes("register") || q.includes("sign up"))) {
    return {
      message:
        "To open an account, go to Register, complete the 3-step signup (personal info, security, identity), and verify your email with the code we send you. Once verified, you'll land on your dashboard with a primary checking account ready.",
      suggestions: [
        { label: "Start registration", value: "Where is the register page?" },
        { label: "Email verification", value: "I didn't get my verification code" },
      ],
    };
  }

  if (q.includes("register page") || q.includes("where") && q.includes("register")) {
    return {
      message: 'Click "Open Account" in the navigation or visit /register to get started.',
      suggestions: [{ label: "Verification help", value: "I didn't get my verification code" }],
    };
  }

  if (q.includes("verification") || q.includes("otp") || q.includes("verify") || q.includes("code")) {
    return {
      message:
        "After registering, check your inbox (and spam) for a 6-digit verification code. Enter it on the verification step to activate your account. In development, the code may also appear on screen if email isn't configured.",
      suggestions: [
        { label: "Resend code", value: "How do I resend my verification code?" },
        { label: "Login help", value: "I can't log in" },
      ],
    };
  }

  if (q.includes("resend")) {
    return {
      message:
        'On the verification step, use the "Resend code" option. If email still doesn\'t arrive, confirm your address or contact support with your registered email.',
      suggestions: [{ label: "Talk to support", value: "I need to speak with support" }],
    };
  }

  if (q.includes("login") || q.includes("log in") || q.includes("sign in") || q.includes("password")) {
    return {
      message:
        'Sign in at /login with your email and password. Forgot your password? Use "Forgot password" to receive a reset code by email.',
      suggestions: [
        { label: "Reset password", value: "How do I reset my password?" },
        { label: "Open account", value: "How do I open an account?" },
      ],
    };
  }

  if (q.includes("reset") && q.includes("password")) {
    return {
      message:
        "Go to Forgot Password, enter your email, and we'll send a one-time code. Enter the code and choose a new password that meets our security requirements.",
      suggestions: [{ label: "Login help", value: "I can't log in" }],
    };
  }

  if (q.includes("withdraw") || q.includes("cash out") || q.includes("payout")) {
    return {
      message:
        "Withdraw via Dashboard → Withdraw. Choose from 11 methods: ACH, Wire, Zelle, PayPal, Venmo, Cash App, Apple Pay, Google Pay, debit card push-to-card, USDC/USDT, or a mailed paper check. Enter your payout details and submit — pending requests reserve your balance until admin approval.",
      suggestions: [
        { label: "Withdrawal timing", value: "How long do withdrawals take?" },
        { label: "Deposit help", value: "How do Bitcoin deposits work?" },
      ],
    };
  }

  if (q.includes("how long") && q.includes("withdraw")) {
    return {
      message:
        "Withdrawal requests are reviewed manually. Most are processed within 24 hours once approved. You'll see the status update in your withdrawal history on the dashboard.",
      suggestions: [{ label: "Withdraw steps", value: "How do withdrawals work?" }],
    };
  }

  if (q.includes("deposit") || q.includes("bitcoin") || q.includes("btc") || q.includes("fund")) {
    return {
      message:
        "Fund your account via Dashboard → Deposit. Send BTC to our wallet address, then click \"I Have Sent the Bitcoin\" to submit your request for admin approval. You'll see a confirmation once submitted — funds are credited after our team verifies the transaction on the blockchain.",
      suggestions: [
        { label: "Deposit status", value: "How long do deposits take?" },
        { label: "Withdraw", value: "How do withdrawals work?" },
      ],
    };
  }

  if (q.includes("how long") && q.includes("deposit")) {
    return {
      message:
        "Bitcoin deposits are reviewed manually after you submit proof. Most are processed within 24 hours once the transaction is confirmed on the network.",
      suggestions: [{ label: "Bitcoin steps", value: "How do Bitcoin deposits work?" }],
    };
  }

  if (q.includes("transfer") || q.includes("send money")) {
    return {
      message:
        "Peer-to-peer transfers between users aren't available in the dashboard right now. To move funds out, use Dashboard → Withdraw. To add funds, use Dashboard → Deposit.",
      suggestions: [{ label: "Withdraw steps", value: "How do withdrawals work?" }],
    };
  }

  if (q.includes("balance") || q.includes("accounts")) {
    return {
      message:
        "Your total balance is on the dashboard home page. For a breakdown by account, open Dashboard → Accounts to see checking, savings, and multi-currency wallets.",
      suggestions: [{ label: "Investments", value: "Tell me about investments" }],
    };
  }

  if (q.includes("kyc") || q.includes("identity") || q.includes("verification document")) {
    return {
      message:
        "KYC (Know Your Customer) verifies your identity. Upload ID front and back during registration or in settings. Status moves from Pending → Submitted → Verified after admin review. Verified accounts have full platform access.",
      suggestions: [{ label: "KYC rejected", value: "My KYC was rejected" }],
    };
  }

  if (q.includes("kyc") && q.includes("reject")) {
    return {
      message:
        "If KYC was rejected, re-upload clear photos of your government ID (all corners visible, no glare). Contact support if you believe this was an error.",
      suggestions: [{ label: "Talk to support", value: "I need to speak with support" }],
    };
  }

  if (q.includes("invest")) {
    return {
      message:
        "Platinum Crest offers an investment suite with portfolio tracking and analytics. Visit Investments in the menu or Dashboard → Investments to view holdings and performance.",
      suggestions: [{ label: "Pricing", value: "What are your fees?" }],
    };
  }

  if (q.includes("fee") || q.includes("pricing") || q.includes("cost") || q.includes("plan")) {
    return {
      message:
        "We offer Starter (free), Premium ($29/mo), and Elite ($99/mo) plans. Starter includes checking & savings, mobile access, and standard support. See the Pricing section on our homepage for full details.",
      suggestions: [{ label: "Open account", value: "How do I open an account?" }],
    };
  }

  if (q.includes("security") || q.includes("safe") || q.includes("encrypt") || q.includes("fdic")) {
    return {
      message:
        "We use bank-grade encryption, multi-factor authentication, and continuous fraud monitoring. Deposits may be eligible for FDIC insurance up to applicable limits. See our Security section and Disclosures page for more.",
      suggestions: [{ label: "Contact support", value: "I need to speak with support" }],
    };
  }

  if (q.includes("support") || q.includes("human") || q.includes("agent") || q.includes("contact")) {
    return {
      message:
        "I can connect you with our team. Use the Contact page (/contact) or submit a message below and we'll email you back. For urgent account issues, include your registered email.",
      suggestions: [
        { label: "Go to Contact page", value: "contact_page" },
        { label: "Deposit help", value: "How do Bitcoin deposits work?" },
      ],
    };
  }

  if (q === "contact_page") {
    return {
      message: "Opening our Contact page—you can send a detailed message to our support team there.",
      suggestions: QUICK_START,
    };
  }

  if (q.includes("hour") || q.includes("available") || q.includes("when")) {
    return {
      message:
        "Crest Assistant is available 24/7. Human support reviews contact form submissions and deposit proofs during business hours (Mon–Fri, 9am–6pm ET).",
      suggestions: [{ label: "Talk to support", value: "I need to speak with support" }],
    };
  }

  if (q.includes("thank")) {
    return {
      message: "You're welcome! Is there anything else I can help you with today?",
      suggestions: QUICK_START,
    };
  }

  return {
    message:
      "I'm not sure about that yet. Try asking about accounts, deposits, transfers, KYC, or security—or choose an option below. For complex issues, our support team can help via the Contact page.",
    suggestions: QUICK_START,
  };
}
