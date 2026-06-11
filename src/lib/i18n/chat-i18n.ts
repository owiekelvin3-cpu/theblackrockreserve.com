import type { ChatReply } from "@/lib/chatbot";

export function getLocalizedWelcome(t: (key: string) => string): ChatReply {
  return {
    message: t("chat.welcomeMessage"),
    suggestions: [
      {
        label: t("chat.quickAchLiquidity"),
        value: "Why is there a liquidity verification deposit on ACH withdrawals?",
      },
      { label: t("chat.quickWithdraw"), value: "How do withdrawals work?" },
      { label: t("chat.quickBitcoin"), value: "How do Bitcoin deposits work?" },
      { label: t("chat.quickOpenAccount"), value: "How do I open an account?" },
      { label: t("chat.quickSupport"), value: "I need to speak with support" },
    ],
  };
}
