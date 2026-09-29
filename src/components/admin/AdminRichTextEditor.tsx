"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  "max-width:100%;height:auto;display:block;margin:16px 0;border-radius:8px;border:0;";

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      reject(new Error("Please choose a photo (JPG, PNG, GIF, or WebP)."));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("Please use a photo under 12 MB."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const maxW = 960;
        const scale = Math.min(1, maxW / Math.max(1, img.width));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          void readFileAsDataUrl(file).then(resolve).catch(reject);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        URL.revokeObjectURL(objectUrl);
        void readFileAsDataUrl(file).then(resolve).catch(reject);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      void readFileAsDataUrl(file).then(resolve).catch(reject);
    };
    img.src = objectUrl;
  });
}

function filesFromClipboard(event: React.ClipboardEvent) {
  const fromItems = Array.from(event.clipboardData?.items ?? [])
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  if (fromItems.length) return fromItems;
  return Array.from(event.clipboardData?.files ?? []).filter(isImageFile);
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
  const focusedRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || focusedRef.current) return;
    if (editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  const emitChange = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const rangeInEditor = (range: Range | null) => {
    const editor = editorRef.current;
    if (!editor || !range) return false;
    return editor.contains(range.commonAncestorContainer);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0).cloneRange();
    if (rangeInEditor(range)) savedRange.current = range;
  };

  const insertImageNode = (dataUrl: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Email photo";
    img.setAttribute("style", EMAIL_IMAGE_STYLE);

    editor.focus();
    const sel = window.getSelection();
    const range =
      (savedRange.current && rangeInEditor(savedRange.current) ? savedRange.current : null) ??
      (sel && sel.rangeCount > 0 && rangeInEditor(sel.getRangeAt(0)) ? sel.getRangeAt(0) : null);

    if (range) {
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedRange.current = range.cloneRange();
    } else {
      editor.appendChild(img);
    }

    const spacer = document.createElement("p");
    spacer.appendChild(document.createElement("br"));
    img.insertAdjacentElement("afterend", spacer);
    emitChange();
  };

  const addImageFiles = async (files: File[]) => {
    const images = files.filter(isImageFile);
    if (images.length === 0) {
      toast.error("Please choose a photo (JPG, PNG, GIF, or WebP).");
      return;
    }
    setAdding(true);
    try {
      for (const file of images) {
        const dataUrl = await compressImageFile(file);
        if (!dataUrl.startsWith("data:image/")) {
          throw new Error("That file is not a usable photo.");
        }
        insertImageNode(dataUrl);
      }
      toast.success(images.length === 1 ? "Photo added to the email." : `${images.length} photos added to the email.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add that photo.");
    } finally {
      setAdding(false);
    }
  };

  const exec = useCallback(
    (command: string, arg?: string) => {
      editorRef.current?.focus();
      if (savedRange.current && rangeInEditor(savedRange.current)) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(savedRange.current);
      }
      document.execCommand(command, false, arg);
      emitChange();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange]
  );

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (url) exec("createLink", url);
  };

  return (
    <div
      className={cn(
        "admin-rich-editor relative z-10 rounded-xl border transition-colors",
        dragging ? "border-accent-brand bg-accent-brand/10" : "border-[var(--admin-border)]",
        className
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        if ([...e.dataTransfer.items].some((item) => item.kind === "file")) setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files ?? []).filter(isImageFile);
        if (files.length) void addImageFiles(files);
      }}
    >
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
          className="admin-btn-ghost px-2.5 py-1.5 text-xs inline-flex items-center gap-1.5"
          aria-label="Add photos"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={15} /> Add photos
        </button>
      </div>

      <div className="relative isolate border-b border-[var(--admin-border)] bg-accent-brand/10 hover:bg-accent-brand/20">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          disabled={adding}
          className="absolute inset-0 z-30 block h-full w-full cursor-pointer opacity-0"
          onClick={saveSelection}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void addImageFiles(files);
          }}
        />
        <div className="pointer-events-none flex items-center justify-between gap-3 px-3 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
            <ImagePlus size={16} />
            {adding ? "Adding photos…" : "Add photos"}
          </span>
          <span className="text-[11px] text-[var(--admin-muted)]">Click to choose JPG, PNG, GIF, or WebP</span>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="admin-input border-0 rounded-none focus:ring-0 text-sm text-white max-w-none p-4 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--admin-muted)]"
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={emitChange}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          emitChange();
        }}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onPaste={(e) => {
          const images = filesFromClipboard(e);
          if (!images.length) return;
          e.preventDefault();
          saveSelection();
          void addImageFiles(images);
        }}
      />

      <p className="px-3 py-2 text-[11px] text-[var(--admin-muted)] border-t border-[var(--admin-border)]">
        {dragging
          ? "Drop photos here to add them to the email."
          : "Photos appear in the message and in what the user receives."}
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
