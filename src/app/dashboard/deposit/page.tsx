"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Bitcoin, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DashboardGate from "@/components/dashboard/DashboardGate";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { formatCurrency, cn } from "@/lib/utils";
import { toast } from "sonner";
import { dispatchNotificationsRefresh } from "@/hooks/use-push-notifications";

interface DepositData {
  bitcoinWalletAddress: string;
  bitcoinPurchaseLink: string;
  depositInstructions: string;
  successMessage: string;
  qrCodeDataUrl: string;
  accounts: { id: string; name: string; currency: string; balance: number }[];
  deposits: {
    id: string;
    amountUsd: number | null;
    txHash: string | null;
    status: string;
    statusLabel?: string;
    reviewNote: string | null;
    createdAt: string;
  }[];
}

interface SuccessState {
  title: string;
  message: string;
}

export default function DepositPage() {
  const [data, setData] = useState<DepositData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [txHash, setTxHash] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const load = (silent = false) => {
    if (!silent) {
      setLoading(true);
      setLoadError(false);
    }
    fetchDashboardJson<DepositData>("/api/dashboard/deposit")
      .then(({ data: json, error }) => {
        if (error || !json) {
          if (!silent) setLoadError(true);
          return;
        }
        setLoadError(false);
        setData(json);
        if (json.accounts?.length) setAccountId((prev) => prev || json.accounts[0].id);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const copyAddress = async () => {
    if (!data?.bitcoinWalletAddress) return;
    await navigator.clipboard.writeText(data.bitcoinWalletAddress);
    setCopied(true);
    toast.success("Wallet address copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) {
      toast.error("Please select an account to credit");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accountId,
          amountUsd: amountUsd ? Number(amountUsd) : undefined,
          txHash: txHash.trim() || undefined,
          proofNote: proofNote || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");

      setSuccess({
        title: json.title ?? "Deposit Request Submitted Successfully",
        message: json.message ?? data?.successMessage ?? "",
      });
      setTxHash("");
      setProofNote("");
      setAmountUsd("");
      load(true);
      dispatchNotificationsRefresh();
      toast.success(json.title ?? "Deposit submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const depositData = data;

  return (
    <DashboardGate isLoading={loading}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bitcoin <span className="gold-gradient-text">Deposit</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {depositData?.depositInstructions ??
              "Send Bitcoin to the wallet address below, then confirm your deposit for admin approval."}
          </p>
        </div>

        {loadError && (
          <Card className="border border-accent-red/30 bg-accent-red/5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-accent-red shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-white font-medium">Could not load deposit settings</p>
                <p className="text-xs text-text-secondary mt-1">Check your connection and try again.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => load()}>
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        )}

        {success && (
          <Card className="border border-accent-green/30 bg-accent-green/5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-accent-green/15 flex items-center justify-center shrink-0">
                <CheckCircle2 size={28} className="text-accent-green" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{success.title}</h2>
                <p className="text-sm text-text-secondary mt-3 leading-relaxed">{success.message}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setSuccess(null)}>
                  Submit another deposit
                </Button>
              </div>
            </div>
          </Card>
        )}

        {depositData && !depositData.bitcoinWalletAddress ? (
          <Card>
            <p className="text-text-secondary text-sm">
              Bitcoin deposits are not configured yet. An admin must set the wallet address in{" "}
              <strong className="text-white">Admin → Settings</strong>.
            </p>
          </Card>
        ) : depositData ? (
          <Card className="space-y-6">
            <div className="flex items-center gap-2 text-accent-brand">
              <Bitcoin size={22} />
              <h2 className="font-semibold text-white">Send Bitcoin</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {depositData.qrCodeDataUrl && (
                <div className="p-3 rounded-2xl bg-bg-primary border border-white/10 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={depositData.qrCodeDataUrl}
                    alt="Bitcoin wallet QR code"
                    width={220}
                    height={220}
                    className="rounded-lg"
                  />
                </div>
              )}
              <div className="flex-1 w-full space-y-3">
                <p className="text-xs text-text-muted uppercase tracking-wider">Wallet Address</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs sm:text-sm break-all p-3 rounded-xl bg-bg-primary border border-white/10 text-accent-brand font-mono">
                    {depositData.bitcoinWalletAddress}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyAddress} className="shrink-0">
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {depositData?.bitcoinPurchaseLink && (
          <Card>
            <h2 className="font-semibold text-white mb-2">Need Bitcoin?</h2>
            <p className="text-sm text-text-secondary mb-4">
              Don&apos;t have Bitcoin yet? Purchase from a trusted exchange using the link below.
            </p>
            <a
              href={depositData.bitcoinPurchaseLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center justify-center gap-2 font-semibold transition-all",
                "btn-gold px-6 py-3 text-sm rounded-full"
              )}
            >
              Buy Bitcoin <ExternalLink size={16} />
            </a>
          </Card>
        )}

        {depositData?.bitcoinWalletAddress && !success && (
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <Upload size={20} className="text-accent-brand" />
              <h2 className="font-semibold text-white">Confirm Your Deposit</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {depositData.accounts.length > 0 ? (
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Credit to account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-text-primary text-sm"
                    required
                  >
                    {depositData.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-accent-red">No account found — contact support before depositing.</p>
              )}
              <Input
                label="Amount sent (USD, optional)"
                type="number"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <Input
                label="Transaction reference (optional)"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Bitcoin transaction hash / TX ID"
              />
              <Input
                label="Note (optional)"
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                placeholder="Any additional details..."
              />
              <Button
                type="submit"
                disabled={submitting || depositData.accounts.length === 0 || !accountId}
              >
                {submitting ? "Submitting..." : "I Have Sent the Bitcoin"}
              </Button>
            </form>
          </Card>
        )}

        {depositData && depositData.deposits.length > 0 && (
          <Card>
            <h2 className="font-semibold text-white mb-4">Your Deposit History</h2>
            <div className="space-y-3">
              {depositData.deposits.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white font-medium">
                      {d.amountUsd != null ? formatCurrency(d.amountUsd) : "Amount pending"}
                    </p>
                    <p className="text-xs text-text-muted font-mono truncate">{d.txHash ?? "—"}</p>
                    <p className="text-xs text-text-muted">{new Date(d.createdAt).toLocaleString()}</p>
                    {d.reviewNote && d.status === "REJECTED" && (
                      <p className="text-xs text-accent-red mt-1">Reason: {d.reviewNote}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${
                      d.status === "APPROVED"
                        ? "bg-accent-green/15 text-accent-green"
                        : d.status === "REJECTED"
                          ? "bg-accent-red/15 text-accent-red"
                          : "bg-accent-brand/15 text-accent-brand"
                    }`}
                  >
                    {d.statusLabel ?? d.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardGate>
  );
}
