"use client";

import { useEffect, useState } from "react";
import { Snowflake, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type FreezeType = "FULL" | "WITHDRAWAL_ONLY";

type AdminFreezeModalProps = {
  open: boolean;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
};

export default function AdminFreezeModal({
  open,
  userName,
  onClose,
  onSuccess,
  userId,
}: AdminFreezeModalProps) {
  const [freezeType, setFreezeType] = useState<FreezeType>("WITHDRAWAL_ONLY");
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setFreezeType("WITHDRAWAL_ONLY");
      setReason("");
      setInternalNotes("");
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Freeze reason is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          freezeType,
          reason: reason.trim(),
          internalNotes: internalNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to freeze account");
      toast.success("Account frozen successfully");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to freeze account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="admin-card max-w-lg w-full p-6 space-y-5 shadow-2xl border border-amber-500/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="freeze-modal-title"
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Snowflake size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 id="freeze-modal-title" className="text-white font-semibold text-lg">
              Freeze Account
            </h3>
            <p className="text-sm text-[var(--admin-muted)] mt-0.5">
              Restrict access for <span className="text-white">{userName}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[var(--admin-muted)] uppercase tracking-wide">
              Freeze Type
            </label>
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--admin-border)] cursor-pointer hover:border-amber-500/30 transition-colors has-[:checked]:border-amber-500/50 has-[:checked]:bg-amber-500/5">
                <input
                  type="radio"
                  name="freezeType"
                  value="WITHDRAWAL_ONLY"
                  checked={freezeType === "WITHDRAWAL_ONLY"}
                  onChange={() => setFreezeType("WITHDRAWAL_ONLY")}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <p className="text-sm font-medium text-white">Withdrawal Freeze Only</p>
                  <p className="text-xs text-[var(--admin-muted)] mt-0.5">
                    User can view balance and activity; withdrawals are blocked.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--admin-border)] cursor-pointer hover:border-red-500/30 transition-colors has-[:checked]:border-red-500/50 has-[:checked]:bg-red-500/5">
                <input
                  type="radio"
                  name="freezeType"
                  value="FULL"
                  checked={freezeType === "FULL"}
                  onChange={() => setFreezeType("FULL")}
                  className="mt-1 accent-red-500"
                />
                <div>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5">
                    Full Account Freeze
                    <ShieldAlert size={14} className="text-red-400" />
                  </p>
                  <p className="text-xs text-[var(--admin-muted)] mt-0.5">
                    Blocks withdrawals and outbound transfers. Dashboard remains visible.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="freeze-reason" className="text-xs font-medium text-[var(--admin-muted)] uppercase tracking-wide">
              Freeze Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              id="freeze-reason"
              className="admin-input mt-1.5 min-h-[88px] resize-y"
              placeholder="Reason shown to the customer (e.g. compliance review, suspicious activity…)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              maxLength={2000}
            />
          </div>

          <div>
            <label htmlFor="freeze-notes" className="text-xs font-medium text-[var(--admin-muted)] uppercase tracking-wide">
              Internal Admin Notes <span className="normal-case text-[var(--admin-muted)]">(optional)</span>
            </label>
            <textarea
              id="freeze-notes"
              className="admin-input mt-1.5 min-h-[72px] resize-y"
              placeholder="Internal notes — not visible to the customer"
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              maxLength={5000}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={loading} className="admin-btn-ghost flex-1 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="admin-btn-primary flex-1 text-sm bg-amber-600 hover:bg-amber-500 border-amber-500/50"
            >
              {loading ? "Freezing…" : "Confirm Freeze"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
