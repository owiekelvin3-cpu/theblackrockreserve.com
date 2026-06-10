"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight, RefreshCw, Receipt,
  Search, SlidersHorizontal, ChevronDown, Loader2,
} from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { cn } from "@/lib/utils";
import type { ActivityCategory } from "@/lib/activity-service";

type ActivityItem = {
  id: string;
  name: string;
  orderId: string;
  date: string;
  amount: number;
  status: string;
  type: string;
  category: ActivityCategory;
};

const PAGE_SIZE = 2;

const ICONS: Record<string, typeof Wallet> = {
  DEPOSIT: ArrowDownLeft,
  WITHDRAWAL: TrendingUp,
  TRANSFER: RefreshCw,
  PAYMENT: Receipt,
  INVESTMENT: TrendingUp,
  PROFIT_CREDIT: ArrowDownLeft,
  PROFIT_DEBIT: ArrowUpRight,
};

function ActivitySkeleton() {
  return (
    <div className="dash-wallet-tile p-4 animate-pulse space-y-3">
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 bg-white/10 rounded" />
          <div className="h-2 w-1/3 bg-white/5 rounded" />
        </div>
        <div className="h-4 w-16 bg-white/10 rounded" />
      </div>
    </div>
  );
}

export default function RecentActivityPanel() {
  const { t, formatCurrency, formatDate, formatTime } = useI18n();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const fetchActivities = useCallback(
    async (pageNum: number, append: boolean) => {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
        category,
        status,
      });
      if (search.trim()) params.set("search", search.trim());
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/dashboard/activities?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setItems((prev) => (append ? [...prev, ...json.items] : json.items));
      setHasMore(json.hasMore);
      setTotal(json.total);
      setPage(pageNum);
    },
    [category, status, search, from, to]
  );

  useEffect(() => {
    setLoading(true);
    fetchActivities(1, false)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [fetchActivities]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchActivities(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const statusLabel = (s: string) => {
    const key = s.toLowerCase();
    if (key === "completed") return t("common.completed");
    if (key === "pending") return t("common.pending");
    if (key === "failed") return t("common.failed");
    return s.charAt(0) + s.slice(1).toLowerCase();
  };

  const categories = [
    { id: "all", label: t("dashboard.activityTypes.all") },
    { id: "deposits", label: t("dashboard.activityTypes.deposits") },
    { id: "withdrawals", label: t("dashboard.activityTypes.withdrawals") },
    { id: "investments", label: t("dashboard.activityTypes.investments") },
    { id: "profits", label: t("dashboard.activityTypes.profits") },
    { id: "transfers", label: t("dashboard.activityTypes.transfers") },
    { id: "account_updates", label: t("dashboard.activityTypes.accountUpdates") },
  ];

  return (
    <div className="dash-panel p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{t("dashboard.recentActivity")}</h2>
          {!loading && total > 0 && (
            <p className="text-xs text-text-muted mt-0.5">{total} total</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="dash-table-search w-full pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-brand/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn("dash-control-btn shrink-0", showFilters && "border-accent-brand/40")}
          >
            <SlidersHorizontal size={14} />
            {t("common.filter")}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="grid sm:grid-cols-3 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <label className="text-[10px] uppercase text-text-muted tracking-wider">{t("common.filter")}</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="dash-table-search w-full mt-1 px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-text-muted tracking-wider">{t("common.status")}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="dash-table-search w-full mt-1 px-3 py-2 text-sm"
                >
                  <option value="all">{t("common.all")}</option>
                  <option value="COMPLETED">{t("common.completed")}</option>
                  <option value="PENDING">{t("common.pending")}</option>
                  <option value="FAILED">{t("common.failed")}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase text-text-muted tracking-wider">{t("common.from")}</label>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="dash-table-search w-full mt-1 px-2 py-2 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-text-muted tracking-wider">{t("common.to")}</label>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="dash-table-search w-full mt-1 px-2 py-2 text-xs" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <ActivitySkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted py-10 text-center">
          {search || category !== "all" || status !== "all" || from || to
            ? t("dashboard.activityEmpty")
            : t("dashboard.noActivity")}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {items.map((a, i) => {
                const Icon = ICONS[a.type] ?? Wallet;
                const statusKey = a.status.toLowerCase();
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i < 5 ? i * 0.04 : 0 }}
                    className="dash-wallet-tile p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Icon size={14} className="text-accent-brand" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-text-primary font-medium truncate">{a.name}</p>
                          <p className="text-xs text-text-muted mt-0.5">{a.orderId}</p>
                        </div>
                      </div>
                      <p className={cn("text-sm font-mono font-medium shrink-0", a.amount >= 0 ? "text-accent-green" : "text-text-primary")}>
                        {a.amount >= 0 ? "+" : ""}{formatCurrency(a.amount)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs text-text-muted">
                      <span>{formatDate(a.date)} · {formatTime(a.date)}</span>
                      <span className="inline-flex items-center gap-1.5 text-text-primary">
                        <span className={cn("h-1.5 w-1.5 rounded-full", statusKey === "completed" ? "bg-accent-green" : statusKey === "failed" ? "bg-accent-red" : "bg-accent-gold")} />
                        {statusLabel(a.status)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {(hasMore || items.length < total) && (
            <motion.button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-sm font-medium text-text-secondary hover:text-text-primary hover:border-accent-brand/30 transition-colors"
              whileTap={{ scale: 0.99 }}
            >
              {loadingMore ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ChevronDown size={16} />
              )}
              {t("dashboard.loadMore")}
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}
