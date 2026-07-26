"use client";

import { useParams } from "next/navigation";
import WithdrawalChargeVerifyingPanel from "@/components/dashboard/WithdrawalChargeVerifyingPanel";

export default function WithdrawalChargeVerifyingPage() {
  const params = useParams();
  const withdrawalId = typeof params.id === "string" ? params.id : "";
  if (!withdrawalId) return null;
  return <WithdrawalChargeVerifyingPanel withdrawalId={withdrawalId} />;
}
