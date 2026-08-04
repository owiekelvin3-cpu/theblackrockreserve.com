"use client";

import { useEffect, useState } from "react";
import { AdminModal } from "@/components/admin/AdminUi";

export function AdminLazyProofModal({
  open,
  onClose,
  proofUrl,
  title = "Payment screenshot",
}: {
  open: boolean;
  onClose: () => void;
  proofUrl: string | null;
  title?: string;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !proofUrl) {
      setImage(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(proofUrl, { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json()) as { image?: string; error?: string };
        if (!res.ok) throw new Error(json.error || "Failed to load screenshot");
        if (!cancelled) setImage(json.image ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load screenshot");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, proofUrl]);

  return (
    <AdminModal open={open} onClose={onClose} title={title}>
      {loading && <p className="text-sm text-[var(--admin-muted)]">Loading screenshot…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="max-h-[70vh] w-full rounded-lg object-contain" />
      )}
    </AdminModal>
  );
}
