"use client";

import { useCallback, useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Link2, Heading2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

export default function AdminRichTextEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  className,
  minHeight = "200px",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = useCallback((command: string, arg?: string) => {
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
              exec(cmd, arg);
            }}
          >
            <Icon size={15} />
          </button>
        ))}
        <button type="button" className="admin-btn-ghost p-2" aria-label="Link" onMouseDown={(e) => { e.preventDefault(); addLink(); }}>
          <Link2 size={15} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="admin-input border-0 rounded-none focus:ring-0 text-sm text-white prose-invert max-w-none p-4"
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={handleInput}
      />
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
              className="prose prose-sm max-w-none text-gray-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-[#E85D04]"
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
