"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Link2, Heading2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

const EMAIL_IMAGE_STYLE =
  "max-width:100%;height:auto;display:block;margin:12px 0;border-radius:8px;border:0;";

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Image must be under 8 MB."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      const scale = Math.min(1, maxW / Math.max(1, img.width));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not process that image."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.74));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read that image."));
    };
    img.src = objectUrl;
  });
}

export default function AdminRichTextEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  className,
  minHeight = "200px",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (!sel || !savedRange.current) return;
    sel.removeAllRanges();
    sel.addRange(savedRange.current);
  };

  const exec = useCallback((command: string, arg?: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (url) exec("createLink", url);
  };

  const insertImageDataUrl = async (file: File) => {
    try {
      const dataUrl = await compressImageFile(file);
      restoreSelection();
      editorRef.current?.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${dataUrl}" alt="" style="${EMAIL_IMAGE_STYLE}" />`
      );
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that image.");
    }
  };

  const addImage = () => {
    saveSelection();
    fileRef.current?.click();
  };

  return (
    <div className={cn("admin-rich-editor rounded-xl border border-[var(--admin-border)] overflow-hidden", className)}>
      <div className="flex flex-wrap gap-1 p-2 border-b border-[var(--admin-border)] bg-white/[0.03]">
        {[
          { icon: Bold, cmd: "bold", label: "Bold" },
          { icon: Italic, cmd: "italic", label: "Italic" },
          { icon: Heading2, cmd: "formatBlock", arg: "h3", label: "Heading" },
          { icon: List, cmd: "insertUnorderedList", label: "Bullet list" },
          { icon: ListOrdered, cmd: "insertOrderedList", label: "Numbered list" },
        ].map(({ icon: Icon, cmd, arg, label }) => (
          <button
            key={label}
            type="button"
            className="admin-btn-ghost p-2"
            aria-label={label}
            onMouseDown={(e) => {
              e.preventDefault();
              saveSelection();
              exec(cmd, arg);
            }}
          >
            <Icon size={15} />
          </button>
        ))}
        <button
          type="button"
          className="admin-btn-ghost p-2"
          aria-label="Link"
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
            addLink();
          }}
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          className="admin-btn-ghost px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5 bg-accent-brand/15 border-accent-brand/30 text-white"
          aria-label="Add image"
          onMouseDown={(e) => {
            e.preventDefault();
            addImage();
          }}
        >
          <ImagePlus size={15} /> Add image
        </button>
        <button
          type="button"
          className="admin-btn-ghost px-2 py-1.5 text-xs"
          aria-label="Insert image from URL"
          onMouseDown={(e) => {
            e.preventDefault();
            saveSelection();
            const url = window.prompt("Paste an image URL");
            if (!url) return;
            const trimmed = url.trim();
            if (!/^https?:\/\//i.test(trimmed)) {
              toast.error("Use an http or https image link.");
              return;
            }
            restoreSelection();
            editorRef.current?.focus();
            document.execCommand(
              "insertHTML",
              false,
              `<img src="${trimmed.replace(/"/g, "&quot;")}" alt="" style="${EMAIL_IMAGE_STYLE}" />`
            );
            if (editorRef.current) onChange(editorRef.current.innerHTML);
          }}
        >
          Image URL
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void (async () => {
              for (const file of files) {
                await insertImageDataUrl(file);
              }
            })();
          }}
        />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="admin-input border-0 rounded-none focus:ring-0 text-sm text-white prose-invert max-w-none p-4 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg"
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={handleInput}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
          if (!file) return;
          e.preventDefault();
          saveSelection();
          void insertImageDataUrl(file);
        }}
        onDrop={(e) => {
          const file = Array.from(e.dataTransfer?.files ?? []).find((item) => item.type.startsWith("image/"));
          if (!file) return;
          e.preventDefault();
          saveSelection();
          void insertImageDataUrl(file);
        }}
      />
      <p className="px-3 py-2 text-[11px] text-[var(--admin-muted)] border-t border-[var(--admin-border)]">
        Click <span className="text-white">Add image</span> to put photos in this email. You can also paste or drop an image into the message.
      </p>
    </div>
  );
}

export function EmailPreviewFrame({
  subject,
  bodyHtml,
  recipientName = "Valued Client",
}: {
  subject: string;
  bodyHtml: string;
  recipientName?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[#F3F4F6] overflow-hidden">
      <div className="px-4 py-2 bg-white border-b border-gray-200 text-xs text-gray-500">
        Preview — how recipients will see your message
      </div>
      <div className="p-4 max-h-[420px] overflow-y-auto">
        <div className="mx-auto max-w-[560px] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-400 via-[#E85D04] to-orange-700" />
          <div className="px-6 py-5 text-center border-b border-gray-100">
            <div className="text-lg font-bold text-gray-900">
              Blackrock <span className="text-[#E85D04]">Reserve</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Secure Banking &amp; Investments</div>
          </div>
          <div className="px-6 py-5 text-sm text-gray-600">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{subject || "Email subject"}</h2>
            <p className="mb-3">Dear {recipientName},</p>
            <div
              className="prose prose-sm max-w-none text-gray-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#E85D04] [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-3"
              dangerouslySetInnerHTML={{ __html: bodyHtml || "<p>Your message will appear here.</p>" }}
            />
            <div className="mt-6 text-center">
              <span className="inline-block px-6 py-2.5 rounded-lg bg-[#E85D04] text-white text-sm font-semibold">
                Open Dashboard
              </span>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} Blackrock Reserve. For assistance, contact support through your dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}
