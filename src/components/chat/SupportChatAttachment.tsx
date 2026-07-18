"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, ImageIcon, Paperclip, X } from "lucide-react";
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

/** Full-screen in-chat image viewer — WhatsApp / iMessage style. */
function InChatImageViewer({
  attachment,
  onClose,
}: {
  attachment: ChatAttachmentView;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const dragY = useRef(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? null;
    dragY.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    dragY.current = (e.touches[0]?.clientY ?? startY.current) - startY.current;
  };

  const onTouchEnd = () => {
    if (dragY.current > 90) onClose();
    startY.current = null;
    dragY.current = 0;
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="chat-image-viewer"
        role="dialog"
        aria-modal="true"
        aria-label={attachment.name}
        className="fixed inset-0 z-[100000] flex flex-col bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-white/95">
            {attachment.name}
          </p>
          <button
            type="button"
            onClick={() => downloadAttachment(attachment)}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/20"
            aria-label="Download image"
          >
            <Download size={15} />
            Save
          </button>
        </div>

        {/* Image stage — tap empty area to close */}
        <button
          type="button"
          className="flex min-h-0 flex-1 cursor-default items-center justify-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-16"
          onClick={onClose}
          aria-label="Close image"
        >
          <motion.img
            src={attachment.dataUrl}
            alt={attachment.name}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-full max-w-full select-none object-contain"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        </button>

        <p className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-[11px] text-white/45">
          Swipe down or tap outside to close
        </p>
      </motion.div>
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const isImage =
    (attachment.kind === "image" || attachment.mime.startsWith("image/")) &&
    !broken &&
    !/heic|heif/i.test(attachment.mime);

  if (isImage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="group mt-2 block w-full overflow-hidden rounded-xl border border-white/15 bg-black/25 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-brand/50"
          aria-label={`Open ${attachment.name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.dataUrl}
            alt={attachment.name}
            className="mx-auto max-h-64 w-full object-cover sm:max-h-72 sm:object-contain"
            onError={() => setBroken(true)}
          />
        </button>
        {viewerOpen && (
          <InChatImageViewer attachment={attachment} onClose={closeViewer} />
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
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
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
        <span className="block truncate text-xs font-medium">{attachment.name}</span>
        <span
          className={cn(
            "mt-0.5 block text-[10px]",
            invert ? "text-white/70" : "text-text-muted"
          )}
        >
          Tap to download
        </span>
      </span>
      <Download size={14} className={invert ? "text-white/80" : "text-text-muted"} />
    </button>
  );
}
