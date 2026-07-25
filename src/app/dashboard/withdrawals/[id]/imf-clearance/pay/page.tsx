"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardGate from "@/components/dashboard/DashboardGate";
import ImfClearancePayPanel, { type ImfClearancePayData } from "@/components/dashboard/ImfClearancePayPanel";
import { toast } from "sonner";

export default function ImfClearancePayPage() {
  const params = useParams();
  const withdrawalId = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<ImfClearancePayData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!withdrawalId) return;
    setLoading(true);
    fetch(`/api/dashboard/withdrawals/${withdrawalId}/imf-clearance`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          toast.error(json.error);
          return;
        }
        setData(json);
      })
      .finally(() => setLoading(false));
  }, [withdrawalId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardGate isLoading={loading}>
      {data ? (
        <ImfClearancePayPanel data={data} />
      ) : (
        <div className="max-w-lg mx-auto dash-card p-6 text-sm text-text-muted">
          IMF clearance payment is not available for this withdrawal.
        </div>
      )}
    </DashboardGate>
  );
}
