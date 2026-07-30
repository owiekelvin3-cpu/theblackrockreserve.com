"use client";

import { useCallback, useState } from "react";
import { AdminModal } from "@/components/admin/AdminUi";
import { toast } from "sonner";

type ProofPreviewState = {
  title: string;
  description?: string;
  proofUrl: string;
  loading: boolean;
  image: string | null;
};

export function useAdminProofPreview() {
  const [preview, setPreview] = useState<ProofPreviewState | null>(null);

  const openProof = useCallback(async (proofUrl: string, meta: { title: string; description?: string }) => {
    setPreview({ ...meta, proofUrl, loading: true, image: null });
    try {
      const res = await fetch(proofUrl, { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load proof");
      setPreview({ ...meta, proofUrl, loading: false, image: json.proofImage ?? null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load proof");
      setPreview(null);
    }
  }, []);

  const closeProof = useCallback(() => setPreview(null), []);

  const modal = (
    <AdminModal
      open={!!preview}
      onClose={closeProof}
      title={preview?.title ?? "Transaction proof"}
      description={preview?.description}
      footer={
        <button type="button" className="admin-btn-ghost text-xs px-4 py-2" onClick={closeProof}>
          Close
        </button>
      }
    >
      {preview?.loading ? (
        <p className="text-sm text-[var(--admin-muted)] py-8 text-center">Loading proof…</p>
      ) : preview?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt="Transaction proof"
          className="w-full max-h-[70vh] object-contain rounded-lg border border-[var(--admin-border)]"
        />
      ) : null}
    </AdminModal>
  );

  return { openProof, closeProof, modal };
}
