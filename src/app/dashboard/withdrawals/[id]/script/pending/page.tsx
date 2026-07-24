"use client";

import { useParams } from "next/navigation";
import WithdrawalScriptView from "@/components/dashboard/WithdrawalScriptView";

export default function WithdrawalScriptPendingPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return <WithdrawalScriptView withdrawalId={id} view="pending" />;
}
