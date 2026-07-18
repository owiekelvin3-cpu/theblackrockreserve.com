"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, ImageIcon, Paperclip, X, ZoomIn } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ChatAttachmentView = {
  name: string;
  mime: string;
  dataUrl: string;
  kind?: "image" | "document" | "file";
};

function downloadAttachment(attachment: ChatAttachmentView) {
  try {
    const match = /^data:([^;]+);base64,(.+)$/i.exec(attachment.dataUrl);
    if (!match) {
      const a = document.createElement("a");
      a.href = attachment.dataUrl;
      a.download = attachment.name;
      a.click();
      return;
    }
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: match[1] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    const a = document.createElement("a");
    a.href = attachment.dataUrl;
    a.download = attachment.name;
    a.click();
  }
}

function ImageLightbox({
  attachment,
  onClose,
}: {
  attachment: ChatAttachmentView;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6" role="presentation">
        <motion.button
          type="button"
          aria-label="Close image"
          className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={attachment.name}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative z-[1] flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <ImageIcon size={16} className="text-accent-brand shrink-0" />
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{attachment.name}</p>
            <button
              type="button"
              onClick={() => downloadAttachment(attachment)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Download size={14} />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/40 p-3 sm:p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className="max-h-[78vh] w-auto max-w-full object-contain"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

export default function SupportChatAttachment({
  attachment,
  invert = false,
}: {
  attachment: ChatAttachmentView;
  invert?: boolean;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const isImage =
    (attachment.kind === "image" || attachment.mime.startsWith("image/")) &&
    !broken &&
    !/heic|heif/i.test(attachment.mime);

  if (isImage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group mt-2 block w-full overflow-hidden rounded-xl border border-white/15 text-left focus:outline-none focus:ring-2 focus:ring-accent-brand/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            className="mx-auto max-h-72 w-full bg-black/20 object-contain"
            onError={() => setBroken(true)}
          />
          <span
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px]",
              invert ? "bg-black/20 text-white/90" : "bg-black/30 text-white/90"
            )}
          >
            <ZoomIn size={12} />
            <span className="truncate flex-1">{attachment.name}</span>
            <span className="opacity-80">View</span>
          </span>
        </button>
        {lightboxOpen && (
          <ImageLightbox attachment={attachment} onClose={() => setLightboxOpen(false)} />
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => downloadAttachment(attachment)}
      className={cn(
        "mt-2 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
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
        ) : attachment.mime.startsWith("image/") ? (
          <ImageIcon size={16} className={invert ? "text-white" : "text-accent-brand"} />
        ) : (
          <Paperclip size={16} className={invert ? "text-white" : "text-accent-brand"} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium truncate">{attachment.name}</span>
        <span className={cn("block text-[10px] mt-0.5", invert ? "text-white/70" : "text-text-muted")}>
          {attachment.mime.startsWith("image/")
            ? "Tap to download image"
            : "Tap to download"}
        </span>
      </span>
      <Download size={14} className={invert ? "text-white/80" : "text-text-muted"} />
    </button>
  );
}
