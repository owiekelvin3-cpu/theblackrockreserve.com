"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const kycMap: Record<string, string> = {
  PENDING: "admin-badge-pending",
  SUBMITTED: "admin-badge-submitted",
  VERIFIED: "admin-badge-verified",
  REJECTED: "admin-badge-rejected",
};

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "admin-badge",
        status === "ACTIVE" ? "admin-badge-verified" : "admin-badge-rejected"
      )}
    >
      {status}
    </span>
  );
}

export function AdminKycBadge({ status }: { status: string }) {
  return (
    <span className={cn("admin-badge", kycMap[status] ?? "admin-badge-default")}>
      {status}
    </span>
  );
}

export function AdminPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("admin-page", className)}>{children}</div>;
}

export function AdminRefreshButton({
  onClick,
  label = "Refresh",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="admin-btn-ghost text-xs px-4 py-2 inline-flex items-center gap-2 min-h-[40px]"
    >
      <RefreshCw size={14} />
      {label}
    </button>
  );
}

export function AdminPageHeader({
  title,
  description,
  eyebrow = "Admin console",
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header-copy">
        <p className="admin-page-eyebrow">{eyebrow}</p>
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-desc">{description}</p>}
      </div>
      {action && <div className="admin-page-header-actions">{action}</div>}
    </header>
  );
}

export function AdminToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("admin-toolbar", className)}>{children}</div>;
}

export function AdminSearchField({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("admin-search-field", className)}>
      <Search size={16} className="admin-search-icon" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="admin-input admin-search-input"
      />
    </div>
  );
}

export function AdminSelectFilter({
  value,
  onChange,
  children,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn("admin-input admin-select-filter", className)}
    >
      {children}
    </select>
  );
}

export function AdminFilterTabs({
  value,
  onChange,
  tabs,
}: {
  value: string;
  onChange: (value: string) => void;
  tabs: { id: string; label: string; count?: number }[];
}) {
  return (
    <div className="admin-filter-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn("admin-filter-tab", value === tab.id && "admin-filter-tab-active")}
        >
          <span>{tab.label}</span>
          {tab.count != null && <span className="admin-filter-tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "brand" | "gold" | "green" | "neutral";
}) {
  return (
    <div className={cn("admin-stat-card", accent && `admin-stat-card-${accent}`)}>
      <p className="admin-stat-card-label">{label}</p>
      <p className="admin-stat-card-value">{value}</p>
      {sub && <p className="admin-stat-card-sub">{sub}</p>}
    </div>
  );
}

export function AdminStatGrid({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={cn("admin-stat-grid", `admin-stat-grid-${cols}`)}>{children}</div>;
}

export function AdminDataCard({
  children,
  className,
  noPadding,
}: {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={cn("admin-data-card", noPadding && "admin-data-card-flush", className)}>
      {children}
    </div>
  );
}

export function AdminTableScroll({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("admin-table-scroll", className)}>{children}</div>;
}

export function AdminMobileList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("admin-mobile-list", className)}>{children}</div>;
}

export function AdminMobileCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("admin-mobile-card", className)}>{children}</div>;
}

export function AdminReviewQueue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("admin-review-queue", className)}>{children}</div>;
}

export function AdminReviewCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("admin-review-card", className)}>{children}</div>;
}

export function AdminFormPanel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("admin-form-panel", className)}>
      {(title || description) && (
        <header className="admin-form-panel-head">
          {title && <h2 className="admin-form-panel-title">{title}</h2>}
          {description && <p className="admin-form-panel-desc">{description}</p>}
        </header>
      )}
      <div className="admin-form-panel-body">{children}</div>
    </section>
  );
}

export function AdminModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "default" | "lg";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;
  return createPortal(
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={cn("admin-modal", size === "lg" && "admin-modal-lg")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-head">
          <h3 id="admin-modal-title" className="admin-modal-title">
            {title}
          </h3>
          {description && <p className="admin-modal-desc">{description}</p>}
        </header>
        <div className="admin-modal-body">{children}</div>
        {footer && <footer className="admin-modal-footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export function AdminSplitLayout({
  main,
  side,
  className,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("admin-split-layout", className)}>
      <div className="admin-split-main">{main}</div>
      <div className="admin-split-side">{side}</div>
    </div>
  );
}
