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

function scoreEntry(entry: KnowledgeEntry, q: string, tokens: string[]): number {
  let score = 0;

  for (const pattern of entry.patterns ?? []) {
    if (pattern.test(q)) score += 12;
  }

  for (const keyword of entry.keywords) {
    const kw = keyword.toLowerCase();
    if (kw.includes(" ")) {
      if (q.includes(kw)) score += 10;
      continue;
    }
    if (tokens.includes(kw)) score += 6;
    if (q.includes(kw)) score += 4;
  }

  return score + entry.priority * 0.01;
}

function findBestMatch(input: string): KnowledgeEntry | null {
  const q = normalize(input);
  const tokens = tokenize(input);

  let best: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of CHATBOT_KNOWLEDGE) {
    const score = scoreEntry(entry, q, tokens);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  // Require a minimum confidence so vague messages get a helpful fallback
  return bestScore >= 4 ? best : null;
}

function buildFallback(input: string): ChatReply {
  const q = normalize(input);
  const tokens = tokenize(input);

  const related = CHATBOT_KNOWLEDGE.filter((entry) => scoreEntry(entry, q, tokens) > 0)
    .sort((a, b) => scoreEntry(b, q, tokens) - scoreEntry(a, q, tokens))
    .slice(0, 3);

  if (related.length > 0) {
    const top = related[0];
    return {
      message: `I may be able to help with that. Here is the closest match:\n\n${top.message}`,
      suggestions: top.suggestions ?? QUICK_START_SUGGESTIONS,
    };
  }

  return {
    message:
      "I'm not sure about that yet. Try asking about withdrawals, ACH liquidity verification, deposits, KYC, investments, or security—or choose an option below. For complex issues, our support team can help via the Contact page.",
    suggestions: QUICK_START_SUGGESTIONS,
  };
}

export function getWelcomeMessage(): ChatReply {
  return {
    message:
      "Hi! I'm Crest Assistant, your Blackrock Reserve guide. I can explain accounts, deposits, withdrawals, ACH liquidity verification, KYC, investments, and security. What would you like to know?",
    suggestions: QUICK_START_SUGGESTIONS,
  };
}

export function getChatReply(input: string): ChatReply {
  const q = normalize(input);

  if (!q) {
    return {
      message: "Please type a message or choose one of the options below.",
      suggestions: QUICK_START_SUGGESTIONS,
    };
  }

  if (q === "contact_page") {
    return {
      message: "Opening our Contact page—you can send a detailed message to our support team there.",
      suggestions: QUICK_START_SUGGESTIONS,
    };
  }

  const match = findBestMatch(input);
  if (match) {
    return {
      message: match.message,
      suggestions: match.suggestions ?? QUICK_START_SUGGESTIONS,
    };
  }

  return buildFallback(input);
}
