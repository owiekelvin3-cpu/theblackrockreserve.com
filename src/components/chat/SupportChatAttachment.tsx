"use client";

import { Download, FileText, ImageIcon, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatAttachmentView = {
  name: string;
  mime: string;
  dataUrl: string;
  kind?: "image" | "document" | "file";
};

export default function SupportChatAttachment({
  attachment,
  invert = false,
}: {
  attachment: ChatAttachmentView;
  invert?: boolean;
}) {
  const isImage =
    attachment.kind === "image" || attachment.mime.startsWith("image/");

  if (isImage) {
    return (
      <a
        href={attachment.dataUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block mt-2 overflow-hidden rounded-xl border border-white/15"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.dataUrl}
          alt={attachment.name}
          className="max-h-48 w-full object-cover"
        />
        <span
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px]",
            invert ? "bg-black/20 text-white/90" : "bg-black/30 text-white/90"
          )}
        >
          <ImageIcon size={12} />
          <span className="truncate">{attachment.name}</span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={attachment.dataUrl}
      download={attachment.name}
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
        invert
          ? "border-white/20 bg-black/15 hover:bg-black/25 text-white"
          : "border-white/10 bg-white/5 hover:bg-white/10 text-text-primary"
      )}
    >
      <span
        className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
          invert ? "bg-white/15" : "bg-accent-brand/15"
        )}
      >
        {attachment.mime.includes("pdf") ? (
          <FileText size={16} className={invert ? "text-white" : "text-accent-brand"} />
        ) : (
          <Paperclip size={16} className={invert ? "text-white" : "text-accent-brand"} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium truncate">{attachment.name}</span>
        <span className={cn("block text-[10px] mt-0.5", invert ? "text-white/70" : "text-text-muted")}>
          Tap to download
        </span>
      </span>
      <Download size={14} className={invert ? "text-white/80" : "text-text-muted"} />
    </a>
  );
}
