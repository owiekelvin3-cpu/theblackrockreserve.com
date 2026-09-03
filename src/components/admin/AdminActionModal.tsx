"use client";

import { useEffect, useState } from "react";
import { AdminModal } from "@/components/admin/AdminUi";

type AdminActionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  children?: React.ReactNode;
};

export default function AdminActionModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "primary",
  onClose,
  onConfirm,
  loading = false,
  requireReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter a reason…",
  children,
}: AdminActionModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) return;
    onConfirm(requireReason ? reason.trim() : undefined);
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className="admin-btn-ghost text-xs px-4 py-2" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`text-xs px-4 py-2 rounded-lg font-medium ${
              variant === "danger" ? "admin-btn-ghost text-red-400" : "admin-btn-primary"
            }`}
            onClick={handleConfirm}
            disabled={loading || (requireReason && !reason.trim())}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </>
      }
    >
      {children}
      {requireReason && (
        <div className="mt-3">
          <label className="block text-xs text-[var(--admin-muted)] mb-1.5">{reasonLabel}</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="admin-input w-full min-h-[100px] text-sm"
            placeholder={reasonPlaceholder}
          />
        </div>
      )}
    </AdminModal>
  );
}
