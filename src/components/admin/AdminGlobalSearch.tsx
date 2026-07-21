"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  LayoutDashboard,
  Bitcoin,
  ArrowUpFromLine,
  ArrowLeftRight,
  Landmark,
  FileCheck,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { ADMIN_NAV_PAGES } from "@/lib/admin-nav";
import type { AdminSearchResult, AdminSearchResultType } from "@/lib/admin-search";
import { cn } from "@/lib/utils";

type SearchItem =
  | { kind: "page"; id: string; title: string; href: string }
  | { kind: "result"; result: AdminSearchResult };

const TYPE_LABEL_KEYS: Record<AdminSearchResultType, string> = {
  user: "admin.searchUsers",
  deposit: "admin.searchDeposits",
  withdrawal: "admin.searchWithdrawals",
  transaction: "admin.searchTransactions",
  loan: "admin.searchLoans",
  tax: "admin.searchTax",
};

function ResultIcon({ type }: { type: AdminSearchResultType | "page" }) {
  const props = { size: 16, className: "shrink-0", "aria-hidden": true as const };
  switch (type) {
    case "user":
      return <User {...props} />;
    case "deposit":
      return <Bitcoin {...props} />;
    case "withdrawal":
      return <ArrowUpFromLine {...props} />;
    case "transaction":
      return <ArrowLeftRight {...props} />;
    case "loan":
      return <Landmark {...props} />;
    case "tax":
      return <FileCheck {...props} />;
    default:
      return <LayoutDashboard {...props} />;
  }
}

export default function AdminGlobalSearch() {
  const { t } = useI18n();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiResults, setApiResults] = useState<AdminSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setApiResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/admin/search?q=${encodeURIComponent(debouncedQuery)}&limit=20`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Search failed"))))
      .then((json: { results?: AdminSearchResult[] }) => {
        if (!cancelled) setApiResults(json.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setApiResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const pageMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ADMIN_NAV_PAGES.filter((page) => t(page.labelKey).toLowerCase().includes(q)).slice(0, 6);
  }, [query, t]);

  const items: SearchItem[] = useMemo(() => {
    const list: SearchItem[] = pageMatches.map((page) => ({
      kind: "page" as const,
      id: `page-${page.href}`,
      title: t(page.labelKey),
      href: page.href,
    }));
    for (const result of apiResults) {
      list.push({ kind: "result", result });
    }
    return list;
  }, [apiResults, pageMatches, t]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, items.length]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      close();
      setQuery("");
      router.push(href);
    },
    [close, router]
  );

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [close]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
      close();
      inputRef.current?.blur();
      return;
    }
    if (!open || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[activeIndex];
      if (!item) return;
      navigate(item.kind === "page" ? item.href : item.result.href);
    }
  };

  const showPanel = open && query.trim().length > 0;
  const hasResults = items.length > 0;
  const showEmpty = showPanel && !loading && !hasResults && debouncedQuery.length >= 2;

  return (
    <div ref={rootRef} className="admin-global-search">
      <div className="admin-global-search-field">
        <Search size={16} className="admin-search-icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder={t("admin.searchPlaceholder")}
          className="admin-input admin-search-input admin-global-search-input"
          aria-label={t("admin.searchPlaceholder")}
          aria-expanded={showPanel}
          aria-controls="admin-global-search-panel"
          aria-autocomplete="list"
          role="combobox"
          autoComplete="off"
        />
        <kbd className="admin-global-search-kbd hidden md:inline-flex" aria-hidden>
          ⌘K
        </kbd>
      </div>

      {showPanel && (
        <div id="admin-global-search-panel" className="admin-global-search-panel" role="listbox">
          {loading && (
            <div className="admin-global-search-status">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              <span>{t("admin.searchLoading")}</span>
            </div>
          )}

          {pageMatches.length > 0 && (
            <div className="admin-global-search-group">
              <p className="admin-global-search-group-label">{t("admin.searchPages")}</p>
              <ul>
                {items
                  .filter((item): item is Extract<SearchItem, { kind: "page" }> => item.kind === "page")
                  .map((item) => {
                    const index = items.indexOf(item);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          className={cn(
                            "admin-global-search-item",
                            index === activeIndex && "admin-global-search-item-active"
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => navigate(item.href)}
                        >
                          <ResultIcon type="page" />
                          <span className="admin-global-search-item-title">{item.title}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {apiResults.length > 0 && (
            <div className="admin-global-search-group">
              <p className="admin-global-search-group-label">{t("admin.searchRecords")}</p>
              <ul>
                {items
                  .filter((item): item is Extract<SearchItem, { kind: "result" }> => item.kind === "result")
                  .map((item) => {
                    const index = items.indexOf(item);
                    const { result } = item;
                    return (
                      <li key={result.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          className={cn(
                            "admin-global-search-item",
                            index === activeIndex && "admin-global-search-item-active"
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => navigate(result.href)}
                        >
                          <ResultIcon type={result.type} />
                          <div className="min-w-0 flex-1 text-left">
                            <p className="admin-global-search-item-title truncate">{result.title}</p>
                            <p className="admin-global-search-item-sub truncate">{result.subtitle}</p>
                            {result.meta && (
                              <p className="admin-global-search-item-meta truncate">{result.meta}</p>
                            )}
                          </div>
                          <span className="admin-global-search-type-pill">
                            {t(TYPE_LABEL_KEYS[result.type])}
                          </span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {showEmpty && (
            <p className="admin-global-search-empty">{t("admin.searchNoResults")}</p>
          )}

          {!loading && hasResults && (
            <div className="admin-global-search-footer">
              <span>{t("admin.searchHint")}</span>
              {debouncedQuery.length >= 2 && (
                <Link
                  href={`/admin/users?search=${encodeURIComponent(debouncedQuery)}`}
                  className="admin-link text-xs"
                  onClick={close}
                >
                  {t("admin.searchAllUsers")}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
