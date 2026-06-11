"use client";

import { Bot, MessageCircle } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { useChat } from "@/components/providers/ChatProvider";

export default function SupportChatPanel() {
  const { t } = useI18n();
  const { openChat } = useChat();

  return (
    <section className="dash-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-accent-brand/15">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="h-11 w-11 rounded-xl brand-gradient-bg flex items-center justify-center shadow-brand shrink-0">
          <Bot size={20} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{t("dashboard.supportChatTitle")}</p>
          <p className="text-sm text-text-muted mt-1">{t("dashboard.supportChatDesc")}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={openChat}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white brand-gradient-bg shadow-brand min-h-[44px] shrink-0"
      >
        <MessageCircle size={16} />
        {t("chat.openChat")}
      </button>
    </section>
  );
}
