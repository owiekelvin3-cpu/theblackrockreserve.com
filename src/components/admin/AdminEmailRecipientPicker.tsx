"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmailRecipientUser = {
  id: string;
  name: string;
  email: string;
  status: string;
  phone?: string | null;
  emailVerified?: boolean;
  lastSeenAt?: string | null;
};

type Props = {
  selected: EmailRecipientUser | null;
  onSelect: (user: EmailRecipientUser) => void;
  onClear: () => void;
  className?: string;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function formatLastSeen(iso: string | null | undefined) {
  if (!iso) return "Never signed in";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 1) return "Active today";
  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminEmailRecipientPicker({ selected, onSelect, onClear, className }: Props) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmailRecipientUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSuggested, setIsSuggested] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const fetchUsers = useCallback(async (q: string, suggest: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      else if (suggest) params.set("suggest", "1");
      const res = await fetch(`/api/admin/email-center/users?${params}`);
      const json = await res.json();
      setResults(json.users ?? []);
      setIsSuggested(Boolean(json.suggested));
    } catch {
      setResults([]);
      setIsSuggested(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      if (query.trim().length === 0) {
        void fetchUsers("", true);
      } else if (query.trim().length >= 1) {
        void fetchUsers(query, false);
      } else {
        setResults([]);
        setIsSuggested(false);
      }
    }, query ? 280 : 0);
    return () => window.clearTimeout(timer);
  }, [query, open, fetchUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pickUser = (user: EmailRecipientUser) => {
    onSelect(user);
    setQuery("");
    setResults([]);
    setOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && highlightIndex >= 0) {
      event.preventDefault();
      pickUser(results[highlightIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  };

  if (selected) {
    return (
      <div className={cn("admin-recipient-selected", className)}>
        <div className="flex items-start gap-3">
          <div className="admin-recipient-avatar" aria-hidden>
            {getInitials(selected.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{selected.name}</p>
            <p className="text-xs text-[var(--admin-muted)] truncate flex items-center gap-1 mt-0.5">
              <Mail size={12} className="shrink-0" />
              {selected.email}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
                  selected.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-amber-500/10 text-amber-400"
                )}
              >
                {selected.status}
              </span>
              {selected.emailVerified && (
                <span className="text-[10px] font-medium text-sky-400 inline-flex items-center gap-1">
                  <CheckCircle2 size={11} /> Verified
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="admin-btn-ghost p-2 shrink-0 text-xs"
            onClick={() => {
              onClear();
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("admin-recipient-picker", className)}>
      <label htmlFor={listId} className="admin-label">
        Find recipient
      </label>
      <p className="text-xs text-[var(--admin-muted)] mb-2">
        Search by name, email, or phone. Start typing or click the field to see recent clients.
      </p>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] pointer-events-none" />
        <input
          ref={inputRef}
          id={listId}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. john@email.com or Jane Smith"
          className="admin-input w-full pl-10 pr-10"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-muted)] animate-spin" />
        )}
        {!loading && query && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--admin-muted)] hover:text-white hover:bg-white/5"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setHighlightIndex(-1);
              inputRef.current?.focus();
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div
          id={`${listId}-listbox`}
          role="listbox"
          className="admin-recipient-dropdown mt-2"
        >
          <div className="px-3 py-2 border-b border-[var(--admin-border)] flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)]">
              {query.trim()
                ? results.length > 0
                  ? `${results.length} match${results.length === 1 ? "" : "es"}`
                  : "No matches"
                : isSuggested
                  ? "Recent clients"
                  : "Start typing to search"}
            </p>
            {!loading && query.trim() && results.length === 0 && (
              <p className="text-[10px] text-[var(--admin-muted)]">Try email or full name</p>
            )}
          </div>

          {loading && results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
              <Loader2 size={20} className="mx-auto mb-2 animate-spin" />
              Searching users…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <User size={24} className="mx-auto mb-2 text-[var(--admin-muted)] opacity-60" />
              <p className="text-sm text-[var(--admin-muted)]">
                {query.trim() ? "No users found for that search" : "No clients available"}
              </p>
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((user, index) => (
                <li key={user.id} role="option" aria-selected={highlightIndex === index}>
                  <button
                    type="button"
                    className={cn(
                      "admin-recipient-option w-full",
                      highlightIndex === index && "admin-recipient-option-active"
                    )}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => pickUser(user)}
                  >
                    <span className="admin-recipient-avatar admin-recipient-avatar-sm">
                      {getInitials(user.name)}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">{user.name}</span>
                        {user.emailVerified && (
                          <CheckCircle2 size={12} className="text-sky-400 shrink-0" aria-label="Verified email" />
                        )}
                      </span>
                      <span className="block text-xs text-[var(--admin-muted)] truncate">{user.email}</span>
                      <span className="block text-[10px] text-[var(--admin-muted)] mt-0.5 opacity-80">
                        {formatLastSeen(user.lastSeenAt)}
                        {user.phone ? ` · ${user.phone}` : ""}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0",
                        user.status === "ACTIVE" ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                      )}
                    >
                      {user.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
