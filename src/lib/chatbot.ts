import {
  CHATBOT_KNOWLEDGE,
  QUICK_START_SUGGESTIONS,
  type KnowledgeEntry,
} from "@/lib/chatbot-knowledge";

export type ChatSuggestion = {
  label: string;
  value: string;
};

export type ChatReply = {
  message: string;
  suggestions?: ChatSuggestion[];
};

export type ChatContext = {
  pathname?: string;
  recentMessages?: { role: "user" | "bot"; content: string }[];
};

/** Maps common phrasing to terms our knowledge base understands */
const SYNONYM_GROUPS: string[][] = [
  ["withdraw", "withdrawal", "cash out", "cashout", "payout", "pull money", "get money out", "wire out"],
  ["deposit", "fund", "add money", "top up", "topup", "send crypto", "send bitcoin"],
  ["buy", "purchase", "invest", "acquire", "open position"],
  ["sell", "close position", "exit", "liquidate", "close trade"],
  ["pin", "transaction pin", "security pin", "4 digit"],
  ["kyc", "identity", "id verification", "verify identity", "documents"],
  ["balance", "funds", "wallet", "available cash", "spendable"],
  ["charge", "fee", "processing charge", "liquidity verification", "15 percent", "15%"],
  ["login", "log in", "sign in", "signin", "access account"],
  ["register", "sign up", "signup", "open account", "create account"],
  ["profit", "gains", "pnl", "p&l", "earnings", "realized"],
  ["support", "human", "agent", "representative", "customer service"],
];

const FOLLOW_UP_RE =
  /^(yes|yeah|yep|yup|ok|okay|sure|please|thanks|thank you|go on|tell me more|more info|explain|elaborate|why|how|what about that|what else|and then|continue)$/i;

const PAGE_TOPIC_BOOST: Record<string, string[]> = {
  "/dashboard/withdrawals": ["withdrawals", "withdrawal-charge-payment", "ach-liquidity-verification", "withdrawal-timing", "transaction-pin"],
  "/dashboard/deposit": ["deposits", "deposit-timing", "transaction-pin"],
  "/dashboard/capital-markets": ["trading-buy", "trading-sell", "insufficient-balance", "capital-markets"],
  "/dashboard/investments": ["trading-sell", "profits-dashboard", "trading-buy"],
  "/dashboard/settings": ["transaction-pin", "reset-password", "kyc", "security"],
  "/dashboard/joint-accounts": ["joint-accounts", "kyc"],
  "/dashboard/analytics": ["loans", "balance"],
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/[^\w\s%$.'-]/g, " ");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function expandWithSynonyms(text: string): string {
  let expanded = normalize(text);
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      if (expanded.includes(term)) {
        expanded += ` ${group.join(" ")}`;
        break;
      }
    }
  }
  return expanded;
}

function enrichQuery(input: string, context?: ChatContext): string {
  let query = input.trim();
  const normalized = normalize(query);

  const history = context?.recentMessages ?? [];
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  if (lastUser && (wordCount <= 5 || FOLLOW_UP_RE.test(normalized))) {
    if (FOLLOW_UP_RE.test(normalized) || /^(why|how|when|where|what)\??$/i.test(normalized)) {
      query = `${lastUser.content} — ${query}`;
    }
  }

  return expandWithSynonyms(query);
}

function scoreEntry(
  entry: KnowledgeEntry,
  q: string,
  tokens: string[],
  context?: ChatContext
): number {
  let score = 0;

  for (const pattern of entry.patterns ?? []) {
    if (pattern.test(q)) score += 14;
  }

  for (const keyword of entry.keywords) {
    const kw = keyword.toLowerCase();
    if (kw.includes(" ")) {
      if (q.includes(kw)) score += 12;
      continue;
    }
    if (tokens.includes(kw)) score += 7;
    if (q.includes(kw)) score += 5;
  }

  if (context?.pathname) {
    const boosts = Object.entries(PAGE_TOPIC_BOOST).find(([path]) =>
      context.pathname?.startsWith(path)
    );
    if (boosts && boosts[1].includes(entry.id)) {
      score += wordOverlapScore(q, entry) > 0 ? 8 : 3;
    }
  }

  return score + entry.priority * 0.01;
}

function wordOverlapScore(q: string, entry: KnowledgeEntry): number {
  const tokens = new Set(tokenize(q));
  let overlap = 0;
  for (const kw of entry.keywords) {
    for (const part of kw.toLowerCase().split(/\s+/)) {
      if (part.length > 2 && tokens.has(part)) overlap++;
    }
  }
  return overlap;
}

function findTopMatches(input: string, context?: ChatContext, limit = 3): { entry: KnowledgeEntry; score: number }[] {
  const enriched = enrichQuery(input, context);
  const q = normalize(enriched);
  const tokens = tokenize(enriched);

  return CHATBOT_KNOWLEDGE.map((entry) => ({
    entry,
    score: scoreEntry(entry, q, tokens, context),
  }))
    .filter((r) => r.score >= 4)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function findBestMatch(input: string, context?: ChatContext): KnowledgeEntry | null {
  const top = findTopMatches(input, context, 2);
  if (top.length === 0) return null;

  const [first, second] = top;
  if (second && first.score - second.score < 3 && second.score >= 6) {
    return first.entry;
  }

  return first.score >= 4 ? first.entry : null;
}

function buildContextualFallback(input: string, context?: ChatContext): ChatReply {
  const top = findTopMatches(input, context, 4);

  if (top.length > 0) {
    const primary = top[0].entry;
    const related = top.slice(1, 3).filter((t) => t.entry.id !== primary.id);

    let message = `Here is what I found on that topic:\n\n${primary.message}`;
    if (related.length > 0) {
      const hints = related.map((r) => `• ${r.entry.message.split("\n")[0]}`).join("\n");
      message += `\n\nYou may also find this helpful:\n${hints}`;
    }

    return {
      message,
      suggestions: primary.suggestions ?? QUICK_START_SUGGESTIONS,
    };
  }

  if (context?.pathname?.startsWith("/dashboard")) {
    const pageHints: Record<string, string> = {
      "/dashboard/withdrawals":
        "You are on the Withdrawals page. I can explain payout methods, the Transaction PIN, processing charges, or timing.",
      "/dashboard/deposit":
        "You are on the Deposit page. I can walk you through Bitcoin funding and how long credits take.",
      "/dashboard/capital-markets":
        "You are in the Trading Marketplace. I can help with buying, selling, closing positions, or balance questions.",
      "/dashboard/investments":
        "You are on Profits & Holdings. I can explain realized gains, open positions, and how to close a trade.",
    };

    const hint = Object.entries(pageHints).find(([path]) => context.pathname?.startsWith(path))?.[1];
    if (hint) {
      return {
        message: `${hint}\n\nTry one of the options below, or ask in your own words.`,
        suggestions: QUICK_START_SUGGESTIONS,
      };
    }
  }

  return {
    message:
      "I want to make sure I point you in the right direction. You can ask about withdrawals, deposits, trading, KYC, your Transaction PIN, or account security—or choose a topic below. For account-specific help, include your registered email when contacting our team.",
    suggestions: QUICK_START_SUGGESTIONS,
  };
}

export function getWelcomeMessage(): ChatReply {
  return {
    message:
      "Hello — I'm Crest Assistant, your Blackrock Reserve concierge. I can guide you through deposits, withdrawals, trading, KYC, security, and your dashboard. What would you like help with?",
    suggestions: QUICK_START_SUGGESTIONS,
  };
}

export function getChatReply(input: string, context?: ChatContext): ChatReply {
  const q = normalize(input);

  if (!q) {
    return {
      message: "Please type a question or choose one of the topics below.",
      suggestions: QUICK_START_SUGGESTIONS,
    };
  }

  if (q === "contact_page") {
    return {
      message: "I'll take you to our Contact page, where you can send a detailed message to our client services team.",
      suggestions: QUICK_START_SUGGESTIONS,
    };
  }

  const match = findBestMatch(input, context);
  if (match) {
    return {
      message: match.message,
      suggestions: match.suggestions ?? QUICK_START_SUGGESTIONS,
    };
  }

  return buildContextualFallback(input, context);
}
