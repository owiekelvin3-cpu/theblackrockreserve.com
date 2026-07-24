"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Upload, Landmark } from "lucide-react";
import DashboardGate from "@/components/dashboard/DashboardGate";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/providers/I18nProvider";
import { toast } from "sonner";
import TransactionPinModal from "@/components/dashboard/TransactionPinModal";
import { useTransactionPin } from "@/hooks/use-transaction-pin";
import { ScriptCard, StaggerIn } from "@/components/dashboard/WithdrawalScriptAnimations";

type ImfPageData = {
  imfPayment: { id: string; amountUsd: number; status: string };
  chargePaymentMethods: {
    bitcoinWalletAddress: string;
    depositInstructions: string;
    qrCodeDataUrl: string;
  };
  canPay: boolean;
};

const ease = [0.22, 1, 0.36, 1] as const;

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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          className="max-w-lg mx-auto dash-card p-6 text-sm text-text-muted"
        >
          IMF clearance payment is not available for this withdrawal.
        </motion.div>
      ) : (
        <form onSubmit={submit} className="max-w-xl mx-auto space-y-6">
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease }}
            onClick={() => router.push(`/dashboard/withdrawals/${withdrawalId}/script/imf-clearance`)}
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </motion.button>

          <ScriptCard className="space-y-5 !p-5 sm:!p-6">
            <StaggerIn>
              <div className="flex items-center gap-2 text-accent-gold">
                <Landmark size={20} />
                <span className="text-xs font-semibold uppercase tracking-wider">IMF clearance</span>
              </div>
              <h1 className="text-xl font-bold text-white mt-2">Pay clearance fee</h1>
              <p className="text-sm text-text-muted mt-1">
                Amount due:{" "}
                <span className="text-accent-gold font-semibold">{formatCurrency(data.imfPayment.amountUsd)}</span>
              </p>
            </StaggerIn>

            {data.chargePaymentMethods.bitcoinWalletAddress && (
              <StaggerIn delay={0.08}>
                <div className="rounded-xl border border-border bg-bg-tertiary/40 p-4 space-y-2 text-sm">
                  <p className="text-text-muted text-xs uppercase tracking-wide">Bitcoin wallet</p>
                  <p className="font-mono break-all text-white text-sm">{data.chargePaymentMethods.bitcoinWalletAddress}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(data.chargePaymentMethods.bitcoinWalletAddress);
                      toast.success("Copied");
                    }}
                  >
                    <Copy size={14} className="mr-1" /> Copy address
                  </Button>
                </div>
              </StaggerIn>
            )}

            <StaggerIn delay={0.14}>
              <Input label="Transaction reference (optional)" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
            </StaggerIn>

            <StaggerIn delay={0.18}>
              <label className="block text-sm">
                <span className="text-text-secondary mb-2 block">Payment screenshot</span>
                <motion.div
                  className="rounded-xl border border-dashed border-border bg-bg-tertiary/30 p-4 transition-colors hover:border-accent-gold/30"
                  whileHover={{ scale: 1.005 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="text-sm w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-accent-gold/15 file:text-accent-gold file:text-xs file:font-medium"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setProofImage(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  {proofImage && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-emerald-400/90 mt-2"
                    >
                      Screenshot attached
                    </motion.p>
                  )}
                </motion.div>
              </label>
            </StaggerIn>

            <StaggerIn delay={0.24}>
              <Button type="submit" className="w-full gap-2" disabled={submitting || pinLoading}>
                <Upload size={16} />
                {submitting ? "Submitting…" : "I've made payment"}
              </Button>
            </StaggerIn>
          </ScriptCard>

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
