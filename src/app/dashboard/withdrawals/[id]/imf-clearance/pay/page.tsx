"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Upload } from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";

type ImfPageData = {
  imfPayment: { id: string; amountUsd: number; status: string };
  chargePaymentMethods: {
    bitcoinWalletAddress: string;
    depositInstructions: string;
    qrCodeDataUrl: string;
  };
  canPay: boolean;
};

export default function ImfClearancePayPage() {
  const params = useParams();
  const router = useRouter();
  const withdrawalId = typeof params.id === "string" ? params.id : "";
  const { formatCurrency } = useI18n();
  const [data, setData] = useState<ImfPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [txHash, setTxHash] = useState("");
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { open: pinOpen, loading: pinLoading, error: pinError, requestPin, closePin, confirmPin } =
    useTransactionPin();

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofImage) {
      toast.error("Payment screenshot is required");
      return;
    }
    requestPin(async (transactionPin) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/dashboard/withdrawals/${withdrawalId}/imf-clearance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            txHash: txHash.trim() || undefined,
            proofImage,
            paymentMethod: "BITCOIN",
            transactionPin,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Submit failed");
        toast.success(json.message);
        router.push("/dashboard/withdrawals");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Submit failed");
      } finally {
        setSubmitting(false);
      }
    });
  };

  return (
    <DashboardGate isLoading={loading}>
      {!data?.canPay ? (
        <div className="max-w-lg mx-auto dash-card p-6 text-sm text-text-muted">
          IMF clearance payment is not available for this withdrawal.
        </div>
      ) : (
        <form onSubmit={submit} className="max-w-xl mx-auto space-y-6">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/withdrawals/${withdrawalId}/script/imf-clearance`)}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-white"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Pay IMF clearance fee</h1>
            <p className="text-sm text-text-muted mt-2">
              Amount due: <span className="text-accent-gold font-semibold">{formatCurrency(data.imfPayment.amountUsd)}</span>
            </p>
          </div>
          {data.chargePaymentMethods.bitcoinWalletAddress && (
            <div className="dash-card p-4 space-y-2 text-sm">
              <p className="text-text-muted">Bitcoin wallet</p>
              <p className="font-mono break-all text-white">{data.chargePaymentMethods.bitcoinWalletAddress}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(data.chargePaymentMethods.bitcoinWalletAddress);
                  toast.success("Copied");
                }}
              >
                <Copy size={14} className="mr-1" /> Copy
              </Button>
            </div>
          )}
          <Input label="Transaction reference (optional)" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
          <label className="block text-sm">
            <span className="text-text-secondary mb-2 block">Payment screenshot</span>
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setProofImage(reader.result as string);
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <Button type="submit" className="w-full gap-2" disabled={submitting || pinLoading}>
            <Upload size={16} />
            {submitting ? "Submitting…" : "I've made payment"}
          </Button>
          <TransactionPinModal
            open={pinOpen}
            onClose={closePin}
            onConfirm={confirmPin}
            loading={pinLoading}
            error={pinError}
          />
        </form>
      )}
    </DashboardGate>
  );
}
