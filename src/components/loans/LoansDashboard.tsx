"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Landmark, Clock, CheckCircle2, XCircle, Zap, FileText, ArrowRight, Lock } from "lucide-react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DashboardGate from "@/components/dashboard/DashboardGate";
import LoanProgressTracker from "@/components/loans/LoanProgressTracker";
import TaxRefundForm from "@/components/loans/TaxRefundForm";
import { fetchDashboardJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/providers/I18nProvider";
import { translateApiErrorMessage } from "@/lib/i18n/api-i18n";
import { estimateMonthlyPayment, getLoanProgressStep } from "@/lib/loan-products";
import { toast } from "sonner";
import { dispatchNotificationsRefresh } from "@/hooks/use-push-notifications";

type LoanData = Awaited<ReturnType<typeof import("@/lib/loan-service").getLoanDashboardData>>;

export default function LoansDashboard() {
  const { t, formatCurrency } = useI18n();
  const { data: session } = useSession();
  const [data, setData] = useState<LoanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resubmitForm, setResubmitForm] = useState(false);
  const [applyProduct, setApplyProduct] = useState<LoanData["products"][0] | null>(null);
  const [applyForm, setApplyForm] = useState({
    requestedAmount: "",
    loanPurpose: "",
    monthlyIncome: "",
    employmentStatus: "Employed",
    supportingDocuments: "",
  });

  const load = () => {
    setLoading(true);
    fetchDashboardJson<LoanData>("/api/dashboard/loans")
      .then(({ data: json }) => setData(json ?? null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const taxStatus = data?.taxVerification?.status;
  const hasApplication = (data?.applications.length ?? 0) > 0;
  const loanDisbursed = data?.applications.some((a) => a.status === "DISBURSED") ?? false;
  const progressStep = getLoanProgressStep(taxStatus, hasApplication, loanDisbursed);

  const submitTaxForm = async (payload: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/loans/tax-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Submission failed");
      toast.success(t("loans.taxSubmitted"));
      setResubmitForm(false);
      dispatchNotificationsRefresh();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? translateApiErrorMessage(e.message, t) : t("loans.genericFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const submitLoanApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyProduct) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/loans/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productId: applyProduct.id,
          requestedAmount: Number(applyForm.requestedAmount),
          loanPurpose: applyForm.loanPurpose,
          monthlyIncome: Number(applyForm.monthlyIncome),
          employmentStatus: applyForm.employmentStatus,
          supportingDocuments: applyForm.supportingDocuments || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Application failed");
      toast.success(t("loans.applicationSubmittedNumber", { number: json.application.applicationNumber }));
      setApplyProduct(null);
      dispatchNotificationsRefresh();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? translateApiErrorMessage(e.message, t) : t("loans.genericFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-amber-500/15 text-amber-400",
      DOCUMENTS_REQUESTED: "bg-orange-500/15 text-orange-400",
      APPROVED: "bg-emerald-500/15 text-emerald-400",
      REJECTED: "bg-red-500/15 text-red-400",
      SUBMITTED: "bg-amber-500/15 text-amber-400",
      UNDER_REVIEW: "bg-blue-500/15 text-blue-400",
      DISBURSED: "bg-emerald-500/15 text-emerald-400",
      ACTIVE: "bg-emerald-500/15 text-emerald-400",
    };
    return (
      <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full", map[status] ?? "bg-white/10 text-text-muted")}>
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <DashboardGate isLoading={loading}>
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-11 w-11 rounded-xl brand-gradient-bg flex items-center justify-center shadow-brand">
              <Landmark size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Loans</h1>
              <p className="text-sm text-text-secondary">Institutional lending with verified tax refund eligibility</p>
            </div>
          </div>
        </motion.div>

        <LoanProgressTracker currentStep={progressStep} />

        {data && data.products.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-lg font-semibold text-text-primary">Available Loan Products</h2>
              {data.loanAccessApproved ? (
                <span className="flex items-center gap-2 text-emerald-400 text-xs">
                  <CheckCircle2 size={14} /> Unlocked — you can apply
                </span>
              ) : (
                <span className="flex items-center gap-2 text-amber-400 text-xs">
                  <Lock size={14} /> Complete tax verification to apply
                </span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {data.products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className={cn(
                    "p-5 h-full flex flex-col transition-colors relative overflow-hidden",
                    data.loanAccessApproved ? "hover:border-accent-brand/30" : "opacity-95"
                  )}>
                    {!data.loanAccessApproved && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                        <span className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-full px-4 py-2 text-xs text-text-secondary">
                          <Lock size={14} /> Verify tax refund to apply
                        </span>
                      </div>
                    )}
                    {p.fastApproval && (
                      <span className="absolute top-3 right-3 z-20 flex items-center gap-1 text-[10px] font-bold uppercase bg-accent-brand/20 text-accent-brand px-2 py-1 rounded-full">
                        <Zap size={10} /> Fast Approval
                      </span>
                    )}
                    <h3 className="font-semibold text-text-primary text-lg">{p.name}</h3>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">{p.description}</p>
                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Rate</p>
                        <p className="font-semibold text-accent-brand">{p.interestRatePercent}% APR</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Max Amount</p>
                        <p className="font-semibold text-text-primary">{formatCurrency(p.maxAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Term</p>
                        <p className="text-text-secondary">{p.repaymentMonthsMin}–{p.repaymentMonthsMax} mo</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-text-muted">Est. Payment</p>
                        <p className="text-text-secondary">{formatCurrency(p.estimatedMonthlyPayment)}/mo</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-muted mt-3 flex-1">{p.eligibilityCriteria}</p>
                    <Button
                      className="mt-4 w-full gap-2 relative z-20"
                      disabled={!data.loanAccessApproved}
                      onClick={() => {
                        if (!data.loanAccessApproved) {
                          toast.message("Submit and get your tax refund form approved first.");
                          return;
                        }
                        setApplyProduct(p);
                        setApplyForm((f) => ({ ...f, requestedAmount: String(Math.min(p.maxAmount, 10000)) }));
                      }}
                    >
                      {data.loanAccessApproved ? (
                        <>Apply <ArrowRight size={16} /></>
                      ) : (
                        <>Locked <Lock size={14} /></>
                      )}
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {(!data?.taxVerification || resubmitForm) && (
          <TaxRefundForm
            defaultEmail={session?.user?.email ?? ""}
            defaultName={session?.user?.name ?? ""}
            onSubmit={submitTaxForm}
            submitting={submitting}
          />
        )}

        {data?.taxVerification && !data.loanAccessApproved && !resubmitForm && (
          <Card className="p-8 text-center">
            {taxStatus === "REJECTED" || taxStatus === "DOCUMENTS_REQUESTED" ? (
              <>
                <XCircle size={40} className="mx-auto text-red-400 mb-4" />
                <h2 className="text-lg font-semibold text-text-primary">
                  {taxStatus === "DOCUMENTS_REQUESTED" ? "Additional Documents Required" : "Verification Requires Attention"}
                </h2>
                <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
                  {data.taxVerification.reviewNote ?? "Please update your submission with the requested information."}
                </p>
                <Button className="mt-6" onClick={() => setResubmitForm(true)}>
                  {taxStatus === "DOCUMENTS_REQUESTED" ? "Upload Documents" : "Resubmit Form"}
                </Button>
              </>
            ) : (
              <>
                <Clock size={40} className="mx-auto text-amber-400 mb-4" />
                <h2 className="text-lg font-semibold text-text-primary">Under Review</h2>
                <p className="text-sm text-text-secondary mt-2 max-w-lg mx-auto">
                  Your Tax Refund Verification is currently under review. Loan products will become available after approval.
                </p>
                <p className="text-xs text-text-muted mt-4">Reference: {data.taxVerification.applicationNumber}</p>
                {statusBadge(data.taxVerification.status)}
                {data.taxVerification.adminNotes && (
                  <p className="text-sm text-text-secondary mt-4 bg-white/5 rounded-xl p-4 text-left max-w-md mx-auto">
                    {data.taxVerification.adminNotes}
                  </p>
                )}
              </>
            )}
          </Card>
        )}

        {data && data.activeLoans.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
              <FileText size={18} /> Active Loans
            </h2>
            <div className="space-y-4">
              {data.activeLoans.map((loan) => (
                <div key={loan.id} className="border border-white/10 rounded-xl p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase">Loan ID</p>
                    <p className="text-sm font-mono text-text-primary">{loan.loanNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase">Approved</p>
                    <p className="text-sm font-semibold text-text-primary">{formatCurrency(loan.approvedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase">Outstanding</p>
                    <p className="text-sm text-accent-brand">{formatCurrency(loan.outstandingBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase">Monthly Payment</p>
                    <p className="text-sm text-text-primary">{formatCurrency(loan.monthlyPayment)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-text-muted uppercase">Next Due</p>
                    <p className="text-sm text-text-secondary">
                      {loan.nextDueDate ? new Date(loan.nextDueDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div>{statusBadge(loan.status)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data && (data.applications.length > 0 || data.loanHistory.length > 0) && (
          <Card className="p-6">
            <h2 className="font-semibold text-text-primary mb-4">Loan History</h2>
            <div className="space-y-3">
              {[...data.applications, ...data.loanHistory.map((l) => ({
                id: l.id,
                applicationNumber: l.loanNumber,
                productName: l.productName,
                requestedAmount: l.approvedAmount,
                status: l.status,
                approvedAmount: l.approvedAmount,
                reviewNote: null,
                createdAt: l.createdAt,
                productType: "",
              }))].slice(0, 15).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm text-text-primary">{a.productName}</p>
                    <p className="text-[10px] text-text-muted font-mono">{a.applicationNumber}</p>
                  </div>
                  <div className="text-right">
                    {statusBadge(a.status)}
                    <p className="text-xs text-text-secondary mt-1">{formatCurrency(a.requestedAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {applyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-text-primary">Apply for {applyProduct.name}</h2>
            <p className="text-xs text-text-muted mt-1">
              {formatCurrency(applyProduct.minAmount)} – {formatCurrency(applyProduct.maxAmount)} · {applyProduct.interestRatePercent}% APR
            </p>
            <form onSubmit={submitLoanApplication} className="mt-6 space-y-4">
              <Input
                label="Requested Loan Amount ($)"
                type="number"
                min={applyProduct.minAmount}
                max={applyProduct.maxAmount}
                value={applyForm.requestedAmount}
                onChange={(e) => setApplyForm({ ...applyForm, requestedAmount: e.target.value })}
                required
              />
              {applyForm.requestedAmount && (
                <p className="text-xs text-text-muted">
                  Est. monthly payment:{" "}
                  {formatCurrency(
                    estimateMonthlyPayment(
                      Number(applyForm.requestedAmount),
                      applyProduct.interestRatePercent,
                      Math.round((applyProduct.repaymentMonthsMin + applyProduct.repaymentMonthsMax) / 2)
                    )
                  )}
                </p>
              )}
              <label className="block">
                <span className="text-sm text-text-secondary mb-1.5 block">Loan Purpose</span>
                <textarea
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-text-primary min-h-[80px]"
                  value={applyForm.loanPurpose}
                  onChange={(e) => setApplyForm({ ...applyForm, loanPurpose: e.target.value })}
                  required
                />
              </label>
              <Input label="Monthly Income ($)" type="number" min="0" value={applyForm.monthlyIncome} onChange={(e) => setApplyForm({ ...applyForm, monthlyIncome: e.target.value })} required />
              <label className="block">
                <span className="text-sm text-text-secondary mb-1.5 block">Employment Status</span>
                <select className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm" value={applyForm.employmentStatus} onChange={(e) => setApplyForm({ ...applyForm, employmentStatus: e.target.value })}>
                  {["Employed", "Self-Employed", "Retired", "Other"].map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setApplyProduct(null)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Application"}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </DashboardGate>
  );
}
