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

export function AdminStatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="admin-card admin-card-glow admin-stat-glow p-5 relative">
      <p className="text-xs text-[var(--admin-muted)] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold gold-gradient-text mt-2">{value}</p>
      {sub && <p className="text-xs text-[var(--admin-muted)] mt-1">{sub}</p>}
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && <p className="text-sm text-[var(--admin-muted)] mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
