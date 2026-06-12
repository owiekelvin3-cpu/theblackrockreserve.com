import type { ChatSuggestion } from "@/lib/chatbot";

export type KnowledgeEntry = {
  id: string;
  /** Higher = wins ties when multiple topics match */
  priority: number;
  keywords: string[];
  patterns?: RegExp[];
  message: string;
  suggestions?: ChatSuggestion[];
};

/** Institutional memory — authoritative answers Crest Assistant can draw on */
export const CHATBOT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "ach-liquidity-verification",
    priority: 100,
    keywords: [
      "ach",
      "liquidity",
      "verification deposit",
      "mirror balance",
      "mirror-balance",
      "solvency",
      "routing network",
      "clearing house",
      "automated clearing",
      "tier 1",
      "structural bounce",
      "escrow",
      "15%",
      "15 percent",
      "fifteen percent",
      "liquidity hold",
      "liquidity verification",
      "processing charge",
      "withdrawal charge",
      "withdrawal fee",
      "why deposit",
      "why pay",
      "temporary deposit",
      "hold dissolves",
      "interest-bearing",
      "60 seconds",
      "ledger ping",
      "high-volume node",
      "receiving account",
      "destination account",
    ],
    patterns: [
      /\b(why|what).*(charge|fee|deposit|hold|15%|15 percent)/i,
      /\b(ach|wire).*(liquidity|verification|deposit|hold)/i,
      /\b(mirror|escrow|solvency)/i,
      /\bwithdraw.*(charge|fee|deposit|pay)/i,
      /\b(charge|fee|deposit).*(withdraw|withdrawal|ach)/i,
      /\bhidden fee\b/i,
      /\bliquidity verification\b/i,
    ],
    message: `Our routing network utilizes an Automated Clearing House (ACH) high-volume node. For a transfer to complete, the receiving account must demonstrate active Solvency Liquidity—the destination must be fully active, secure, and capable of absorbing a Tier 1 transfer without triggering an automatic structural bounce.

To satisfy this automated protocol, the network requires a temporary Liquidity Verification Deposit equal to 15% of your initial withdrawal amount.

Important points:
• This is not a hidden fee—we do not charge you for the transfer itself.
• This is a mirror-balance verification step. The funds remain entirely yours.
• The amount is placed in a secured, interest-bearing escrow sub-account for exactly 60 seconds while the system pings the ledger.
• The moment the node verifies liquidity, the hold dissolves, and the 15% is released and paid out together with your initial transfer to the receiving account.

In your dashboard, you will complete this step on the Pay Processing Charge page after confirming your withdrawal with your Transaction PIN.`,
    suggestions: [
      { label: "Withdrawal steps", value: "How do withdrawals work?" },
      { label: "Pay processing charge", value: "How do I pay the withdrawal processing charge?" },
      { label: "Talk to support", value: "I need to speak with support" },
    ],
  },
  {
    id: "withdrawal-charge-payment",
    priority: 90,
    keywords: [
      "pay charge",
      "processing charge",
      "pay processing",
      "charge payment",
      "submit proof",
      "transaction hash",
      "tx hash",
      "bitcoin payment",
      "pay fee",
    ],
    patterns: [/\bpay.*(charge|fee|processing)/i, /\b(processing|withdrawal) charge\b/i],
    message:
      "After you confirm a withdrawal with your Transaction PIN, you are taken to the Pay Processing Charge page if a liquidity verification applies. Send the required amount via the Bitcoin wallet shown, then submit your transaction reference (hash) and optional note. Our treasury team verifies the deposit; once approved, your withdrawal moves to review for payout.",
    suggestions: [
      { label: "ACH liquidity explained", value: "Why is there a liquidity verification deposit on ACH withdrawals?" },
      { label: "Withdrawal timing", value: "How long do withdrawals take?" },
    ],
  },
  {
    id: "withdrawals",
    priority: 80,
    keywords: ["withdraw", "cash out", "payout", "pull money", "get money out", "wire out", "zelle", "venmo", "paypal"],
    patterns: [/\bhow.*withdraw/i, /\bwithdraw.*work/i],
    message:
      "Withdraw via Dashboard → Withdraw. Choose from 11 methods: ACH, Wire, Zelle, PayPal, Venmo, Cash App, Apple Pay, Google Pay, debit card push-to-card, USDC/USDT, or a mailed paper check. Enter payout details, confirm with your Transaction PIN, and submit. If a liquidity verification deposit applies, you will complete payment on the next screen before the request proceeds to review.",
    suggestions: [
      { label: "ACH liquidity verification", value: "Why is there a liquidity verification deposit on ACH withdrawals?" },
      { label: "Withdrawal timing", value: "How long do withdrawals take?" },
      { label: "Transaction PIN", value: "What is the Transaction PIN?" },
    ],
  },
  {
    id: "withdrawal-timing",
    priority: 75,
    keywords: ["how long", "withdrawal time", "when will", "processing time", "pending withdrawal"],
    patterns: [/\bhow long.*withdraw/i, /\bwhen.*(withdraw|payout|money)/i],
    message:
      "Withdrawal requests are reviewed after any required liquidity verification is confirmed. Most are processed within 24 hours once approved. Track status in Dashboard → Withdraw → Withdrawal History.",
    suggestions: [
      { label: "ACH liquidity explained", value: "Why is there a liquidity verification deposit?" },
      { label: "Withdraw steps", value: "How do withdrawals work?" },
    ],
  },
  {
    id: "transaction-pin",
    priority: 70,
    keywords: ["transaction pin", "pin code", "4 digit", "four digit", "security pin", "withdrawal pin"],
    patterns: [/\btransaction pin\b/i, /\b(pin|code).*(withdraw|transfer|deposit)/i],
    message:
      "Your Transaction PIN is a secure 4-digit code required to authorize withdrawals, deposits, investments, and other sensitive actions. Set or change it in Dashboard → Settings → Security. It is separate from your login password.",
    suggestions: [
      { label: "Withdraw funds", value: "How do withdrawals work?" },
      { label: "Security", value: "How secure is my account?" },
    ],
  },
  {
    id: "deposits",
    priority: 70,
    keywords: ["deposit", "bitcoin", "btc", "fund", "add money", "top up", "send crypto"],
    patterns: [/\bhow.*deposit/i, /\bdeposit.*work/i],
    message:
      "Fund your account via Dashboard → Deposit. Send BTC to our wallet address, then click \"I Have Sent the Bitcoin\" and confirm with your Transaction PIN. Our team verifies the transaction on-chain before crediting your balance—most deposits are processed within 24 hours.",
    suggestions: [
      { label: "Deposit timing", value: "How long do deposits take?" },
      { label: "Withdraw", value: "How do withdrawals work?" },
    ],
  },
  {
    id: "deposit-timing",
    priority: 65,
    keywords: ["deposit time", "how long deposit", "when credited"],
    patterns: [/\bhow long.*deposit/i],
    message:
      "Bitcoin deposits are reviewed manually after you submit proof. Most are credited within 24 hours once the transaction is confirmed on the network.",
    suggestions: [{ label: "Bitcoin steps", value: "How do Bitcoin deposits work?" }],
  },
  {
    id: "register",
    priority: 65,
    keywords: ["open account", "register", "sign up", "create account", "new account", "join"],
    patterns: [/\b(open|create|start).*(account)/i, /\bhow.*register/i],
    message:
      "To open an account, go to Register and complete the 3-step signup: personal details, security credentials, and identity upload. Once finished, sign in with your email and password—your dashboard opens with Primary Checking and High-Yield Savings accounts ready.",
    suggestions: [
      { label: "KYC", value: "What is the KYC process?" },
      { label: "Login help", value: "I can't log in" },
    ],
  },
  {
    id: "register-page",
    priority: 60,
    keywords: ["register page", "where register", "sign up page"],
    message: 'Click "Open Account" in the navigation or visit /register to get started.',
    suggestions: [{ label: "Open account steps", value: "How do I open an account?" }],
  },
  {
    id: "login",
    priority: 60,
    keywords: ["login", "log in", "sign in", "password", "can't access", "locked out", "wrong password", "another account"],
    patterns: [/\bcan.?t log/i, /\bforgot password/i, /\b(sign in|log in).*(another|different|other) account/i],
    message:
      'Sign in at /login with your email and password—no extra verification step is required. Use "Forgot password" if you need a reset code sent to your email. To switch accounts, sign out from the dashboard sidebar and sign in with the other email.',
    suggestions: [
      { label: "Reset password", value: "How do I reset my password?" },
      { label: "Open account", value: "How do I open an account?" },
    ],
  },
  {
    id: "reset-password",
    priority: 55,
    keywords: ["reset password", "change password", "new password", "forgot password"],
    message:
      "Go to Forgot Password, enter your email, and we'll send a one-time code. Enter the code and choose a new password that meets our security requirements.",
    suggestions: [{ label: "Login help", value: "I can't log in" }],
  },
  {
    id: "kyc",
    priority: 55,
    keywords: ["kyc", "identity", "id verification", "document", "government id", "verified"],
    patterns: [/\bkyc.*reject/i],
    message:
      "KYC (Know Your Customer) verifies your identity. Upload ID front and back during registration or in Settings. Status moves Pending → Submitted → Verified after compliance review. Verified accounts have full platform access.",
    suggestions: [
      { label: "KYC rejected", value: "My KYC was rejected" },
      { label: "Open account", value: "How do I open an account?" },
    ],
  },
  {
    id: "kyc-rejected",
    priority: 58,
    keywords: ["kyc rejected", "id rejected", "verification failed", "denied kyc"],
    message:
      "If KYC was rejected, re-upload clear photos of your government ID (all corners visible, no glare). Contact support if you believe this was an error.",
    suggestions: [{ label: "Talk to support", value: "I need to speak with support" }],
  },
  {
    id: "capital-markets",
    priority: 50,
    keywords: ["invest", "investment", "capital markets", "stocks", "etf", "portfolio", "trade", "market", "marketplace", "trading"],
    patterns: [/\bhow.*invest/i, /\btrading marketplace/i],
    message:
      "Open Dashboard → Trading Marketplace to browse live equities, review charts, and place buy orders from your wallet. Confirm purchases with your Transaction PIN. Owned positions show a Close Position action so you can exit at any time.",
    suggestions: [
      { label: "Buy stocks", value: "How do I buy stocks?" },
      { label: "Sell holdings", value: "How do I sell or close a position?" },
      { label: "Transaction PIN", value: "What is the Transaction PIN?" },
    ],
  },
  {
    id: "trading-buy",
    priority: 52,
    keywords: ["buy stock", "buy shares", "purchase stock", "place order", "open position", "buy more"],
    patterns: [/\bhow.*(buy|purchase).*(stock|share|asset)/i, /\bbuy.*(marketplace|stock)/i],
    message:
      "In Dashboard → Trading Marketplace, select an asset, enter the amount or shares, and confirm with your Transaction PIN. Purchases draw from your total spendable balance across checking and savings. After buying, the asset appears in your Portfolio tab with Close Position available.",
    suggestions: [
      { label: "Insufficient balance", value: "Why does it say insufficient balance when I try to buy?" },
      { label: "Sell holdings", value: "How do I sell or close a position?" },
    ],
  },
  {
    id: "trading-sell",
    priority: 52,
    keywords: ["sell", "close position", "exit trade", "liquidate", "sell stock", "sell shares", "close holding", "realized"],
    patterns: [/\bhow.*(sell|close).*(stock|position|share|holding)/i, /\b(sell|close).*(marketplace|portfolio)/i],
    message:
      "To close a position, open Trading Marketplace or Profits & Holdings and tap Close Position on the asset you own. Enter shares or dollar amount, confirm, and proceeds return to your wallet. Realized profit or loss is recorded automatically on your profit dashboard.",
    suggestions: [
      { label: "View profits", value: "Where do I see my trading profits?" },
      { label: "Buy stocks", value: "How do I buy stocks?" },
    ],
  },
  {
    id: "profits-dashboard",
    priority: 51,
    keywords: ["profit dashboard", "profits", "holdings", "realized gain", "portfolio earnings", "p&l", "pnl"],
    patterns: [/\bwhere.*(profit|gain|holding)/i, /\b(profit|gain).*(dashboard|balance)/i],
    message:
      "Dashboard → Profits & Holdings shows capital deployed, total profit balance, realized trading P&L, and each open position. Use Close Position on any row to sell instantly. Realized gains from completed sales flow to your profit balance automatically.",
    suggestions: [
      { label: "Sell holdings", value: "How do I sell or close a position?" },
      { label: "Trading marketplace", value: "How does the trading marketplace work?" },
    ],
  },
  {
    id: "insufficient-balance",
    priority: 55,
    keywords: ["insufficient", "not enough", "balance too low", "can't buy", "cannot buy", "purchase failed", "not enough funds"],
    patterns: [/insufficient balance/i, /not enough (money|funds|balance|cash)/i, /\bcan.?t buy/i],
    message:
      "Stock purchases use your total spendable balance across Primary Checking and High-Yield Savings—not checking alone. If you see insufficient balance, confirm your combined wallet total on the dashboard or reduce the order size. You can also move funds between accounts under Savings transfer if needed.",
    suggestions: [
      { label: "Check balance", value: "Where do I see my balance?" },
      { label: "Buy stocks", value: "How do I buy stocks?" },
    ],
  },
  {
    id: "loans",
    priority: 48,
    keywords: ["loan", "borrow", "credit line", "lending", "analytics", "tax verification"],
    patterns: [/\bhow.*(loan|borrow)/i, /\bapply.*loan/i],
    message:
      "Loan applications are available under Dashboard → Loans. Complete any required tax verification steps, submit your application, and track status from the same page. Our team reviews submissions and updates you in the dashboard.",
    suggestions: [
      { label: "KYC", value: "What is the KYC process?" },
      { label: "Talk to support", value: "I need to speak with support" },
    ],
  },
  {
    id: "joint-accounts",
    priority: 50,
    keywords: ["joint account", "shared account", "partner", "co-owner", "invite"],
    message:
      "Joint Accounts let you share a banking relationship with another member. Go to Dashboard → Joint Accounts to invite a partner, approve shared transactions, and manage joint deposits or investments.",
    suggestions: [{ label: "Open account", value: "How do I open an account?" }],
  },
  {
    id: "balance",
    priority: 45,
    keywords: ["balance", "available balance", "checking", "savings", "how much"],
    message:
      "Your balances appear on the dashboard home page. Available balance reflects funds not reserved by pending withdrawals. Use Savings to move money between checking and savings instantly.",
    suggestions: [{ label: "Withdraw", value: "How do withdrawals work?" }],
  },
  {
    id: "transfer",
    priority: 45,
    keywords: ["transfer", "send money", "move money", "p2p"],
    message:
      "Peer-to-peer transfers between users aren't available in the dashboard right now. To move funds out, use Dashboard → Withdraw. To add funds, use Dashboard → Deposit.",
    suggestions: [{ label: "Withdraw steps", value: "How do withdrawals work?" }],
  },
  {
    id: "fees",
    priority: 45,
    keywords: ["fee", "pricing", "cost", "charge", "subscription", "monthly fee"],
    patterns: [/\bwhat.*(fee|cost|charge)/i, /\bany fee/i],
    message:
      "Blackrock Reserve does not charge monthly subscription fees for standard banking accounts. Investment products may carry fund-level expenses disclosed before you invest. Withdrawals may require a Liquidity Verification Deposit (mirror-balance step—not a transfer fee) as explained in our ACH routing protocol.",
    suggestions: [
      { label: "ACH liquidity explained", value: "Why is there a liquidity verification deposit?" },
      { label: "Disclosures", value: "Where are your disclosures?" },
    ],
  },
  {
    id: "security",
    priority: 45,
    keywords: ["security", "safe", "encrypt", "fdic", "insured", "fraud", "protect"],
    message:
      "We use bank-grade encryption, session security, Transaction PIN protection, and continuous fraud monitoring. Deposits may be eligible for FDIC insurance up to applicable limits. See Security and Disclosures for details.",
    suggestions: [{ label: "Transaction PIN", value: "What is the Transaction PIN?" }],
  },
  {
    id: "support",
    priority: 40,
    keywords: ["support", "human", "agent", "contact", "help me", "speak to", "talk to", "customer service"],
    message:
      "I can connect you with our team. Use the Contact page (/contact) or Support Chat in the menu. For urgent account issues, include your registered email and transaction reference.",
    suggestions: [
      { label: "Go to Contact page", value: "contact_page" },
      { label: "ACH liquidity explained", value: "Why is there a liquidity verification deposit?" },
    ],
  },
  {
    id: "hours",
    priority: 35,
    keywords: ["hours", "available", "business hours", "when open", "24/7"],
    message:
      "Crest Assistant is available 24/7. Human support reviews contact submissions and deposit or charge proofs during business hours (Mon–Fri, 9am–6pm ET).",
    suggestions: [{ label: "Talk to support", value: "I need to speak with support" }],
  },
  {
    id: "disclosures",
    priority: 35,
    keywords: ["disclosure", "terms", "privacy", "legal", "policy"],
    message:
      "Review our Terms, Privacy Policy, Disclosures, and Cookies pages from the website footer. These documents explain how we handle your data, products, and regulatory notices.",
    suggestions: [{ label: "Security", value: "How secure is my account?" }],
  },
  {
    id: "greeting",
    priority: 10,
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "help"],
    patterns: [/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i, /^help$/i],
    message:
      "Hello! Welcome to Blackrock Reserve. I can help with deposits, withdrawals, trading, KYC, your Transaction PIN, and account security. What would you like to know?",
    suggestions: [
      { label: "Withdraw funds", value: "How do withdrawals work?" },
      { label: "Buy & sell stocks", value: "How do I buy stocks?" },
      { label: "Bitcoin deposits", value: "How do Bitcoin deposits work?" },
      { label: "Talk to support", value: "I need to speak with support" },
    ],
  },
  {
    id: "thanks",
    priority: 5,
    keywords: ["thank", "thanks", "appreciate", "helpful"],
    patterns: [/\bthank/i],
    message: "You're welcome! Is there anything else I can help you with today?",
    suggestions: [
      { label: "Withdraw funds", value: "How do withdrawals work?" },
      { label: "ACH liquidity explained", value: "Why is there a liquidity verification deposit?" },
    ],
  },
];

export const QUICK_START_SUGGESTIONS: ChatSuggestion[] = [
  { label: "Withdraw funds", value: "How do withdrawals work?" },
  { label: "Buy & sell stocks", value: "How do I buy stocks?" },
  { label: "ACH liquidity verification", value: "Why is there a liquidity verification deposit on ACH withdrawals?" },
  { label: "Bitcoin deposits", value: "How do Bitcoin deposits work?" },
  { label: "Talk to support", value: "I need to speak with support" },
];
