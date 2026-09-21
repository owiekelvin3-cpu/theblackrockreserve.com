"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  GripVertical, Pencil, Pin, Star, Power, PowerOff, Trash2, Upload, X, Plus,
} from "lucide-react";
import {
  defaultDurationPlans,
  getDurationPlans,
  newDurationPlanId,
  scaleAnnualReturn,
  type MarketDurationPlan,
} from "@/lib/market-duration";
import {
  AdminPage,
  AdminPageHeader,
  AdminRefreshButton,
  AdminDataCard,
  AdminTableScroll,
  AdminFormPanel,
} from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency, cn } from "@/lib/utils";
import type { MarketAssetRecord } from "@/lib/market-asset-mapper";
import StockIcon from "@/components/capital-markets/StockIcon";

type AssetRow = MarketAssetRecord;

const SECTORS = [
  "Technology",
  "Financial Services",
  "Healthcare",
  "Energy",
  "Consumer & Retail",
  "Industrial",
  "Entertainment",
];

const EMPTY_FORM = {
  symbol: "",
  name: "",
  sector: "Technology",
  description: "",
  logoDomain: "",
  logoUrl: "" as string | null,
  price: "",
  changePercent: "0",
  minInvestment: "100",
  riskRating: "Medium" as "Low" | "Medium" | "High",
  expectedReturnPercent: "8",
  growthRate: "0",
  return7d: "0",
  return14d: "0",
  return30d: "0",
  return90d: "0",
  return1y: "0",
  returnWeekly: "0",
  returnMonthly: "0",
  returnYearly: "0",
  customReturnLabel: "",
  customReturnPercent: "",
  durationPlans: defaultDurationPlans({
    expectedReturnPercent: 8,
    return7d: 0,
    return14d: 0,
    return30d: 0,
    return90d: 0,
    return1y: 0,
    returnWeekly: 0,
    returnMonthly: 0,
    returnYearly: 0,
  }) as MarketDurationPlan[],
  marketCapRank: "999",
  popularity: "0",
  isFeatured: false,
  isPinned: false,
  enabled: true,
};

function assetToForm(a: AssetRow) {
  return {
    symbol: a.symbol,
    name: a.name,
    sector: a.sector,
    description: a.description,
    logoDomain: a.logoDomain ?? "",
    logoUrl: a.logoUrl,
    price: String(a.price),
    changePercent: String(a.changePercent),
    minInvestment: String(a.minInvestment),
    riskRating: a.riskRating as "Low" | "Medium" | "High",
    expectedReturnPercent: String(a.expectedReturnPercent),
    growthRate: String(a.growthRate),
    return7d: String(a.return7d),
    return14d: String(a.return14d),
    return30d: String(a.return30d),
    return90d: String(a.return90d),
    return1y: String(a.return1y),
    returnWeekly: String(a.returnWeekly),
    returnMonthly: String(a.returnMonthly),
    returnYearly: String(a.returnYearly),
    customReturnLabel: a.customReturnLabel ?? "",
    customReturnPercent: a.customReturnPercent != null ? String(a.customReturnPercent) : "",
    durationPlans: getDurationPlans(a),
    marketCapRank: String(a.marketCapRank),
    popularity: String(a.popularity),
    isFeatured: a.isFeatured,
    isPinned: a.isPinned,
    enabled: a.enabled,
  };
}

function formPayload(form: typeof EMPTY_FORM, isEdit: boolean) {
  const num = (v: string) => {
    if (v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const symbol = form.symbol.trim().toUpperCase();
  const name = form.name.trim() || symbol || "Asset";
  const price = num(form.price);

  const payload: Record<string, unknown> = {
    ...(isEdit ? {} : { symbol }),
    name,
    sector: form.sector || "Technology",
    description: form.description.trim() || `${name} equity security.`,
    logoDomain: form.logoDomain.trim() || null,
    logoUrl: form.logoUrl || null,
    riskRating: form.riskRating,
    isFeatured: form.isFeatured,
    isPinned: form.isPinned,
    enabled: form.enabled,
  };

  if (price !== undefined) payload.price = price;
  else if (!isEdit) payload.price = 1;

  const optionalFields: [string, string][] = [
    ["changePercent", form.changePercent],
    ["minInvestment", form.minInvestment],
    ["expectedReturnPercent", form.expectedReturnPercent],
    ["growthRate", form.growthRate],
    ["return7d", form.return7d],
    ["return14d", form.return14d],
    ["return30d", form.return30d],
    ["return90d", form.return90d],
    ["return1y", form.return1y],
    ["returnWeekly", form.returnWeekly],
    ["returnMonthly", form.returnMonthly],
    ["returnYearly", form.returnYearly],
    ["marketCapRank", form.marketCapRank],
    ["popularity", form.popularity],
  ];

  for (const [key, value] of optionalFields) {
    const parsed = num(value);
    if (parsed !== undefined) payload[key] = parsed;
  }

  payload.customReturnLabel = form.customReturnLabel.trim() || null;
  payload.customReturnPercent =
    form.customReturnPercent === "" ? null : num(form.customReturnPercent) ?? null;
  payload.durationPlans = form.durationPlans.map((plan) => ({
    id: plan.id,
    days: plan.days,
    label: plan.label,
    returnPercent: plan.returnPercent,
    enabled: plan.enabled,
  }));

  return payload;
}

export default function AdminMarketAssetsManager() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ assets: AssetRow[] }>(
    "/api/admin/market-assets"
  );
  const [orderedAssets, setOrderedAssets] = useState<AssetRow[]>([]);

  useEffect(() => {
    if (data?.assets) setOrderedAssets(data.assets);
  }, [data?.assets]);

  const displayAssets = orderedAssets;

  const [busy, setBusy] = useState<string | null>(null);
  const [panel, setPanel] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dragId, setDragId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setPanel("create");
  };

  const openEdit = (a: AssetRow) => {
    setForm(assetToForm(a));
    setEditId(a.id);
    setPanel("edit");
  };

  const closePanel = () => {
    setPanel(null);
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 400_000) {
      toast.error("Image must be under 400 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setForm((f) => ({ ...f, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const saveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (panel === "create" && !form.symbol.trim()) {
      toast.error("Symbol is required");
      return;
    }
    const price = form.price === "" ? 1 : Number(form.price);
    if (form.price !== "" && (!Number.isFinite(price) || price <= 0)) {
      toast.error("Enter a valid price or leave blank to use $1.00");
      return;
    }

    setBusy(panel === "create" ? "create" : editId);
    try {
      const payload = formPayload(form, panel === "edit");
      const url = panel === "edit" && editId ? `/api/admin/market-assets/${editId}` : "/api/admin/market-assets";
      const method = panel === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(panel === "edit" ? `${form.symbol} updated` : `${form.symbol.toUpperCase()} created`);
      closePanel();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const patchAsset = async (id: string, patch: Record<string, unknown>, label: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/market-assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success(label);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const deleteAsset = async (a: AssetRow) => {
    if (!confirm(`Remove ${a.symbol}? Assets with investments will be disabled.`)) return;
    setBusy(a.id);
    try {
      const res = await fetch(`/api/admin/market-assets/${a.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success(json.message ?? `${a.symbol} removed`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  };

  const reorder = useCallback(
    async (fromId: string, toId: string) => {
      const list = [...displayAssets];
      const fromIdx = list.findIndex((a) => a.id === fromId);
      const toIdx = list.findIndex((a) => a.id === toId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      setOrderedAssets(list);

      try {
        const res = await fetch("/api/admin/market-assets/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orderedIds: list.map((a) => a.id) }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Reorder failed");
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Reorder failed");
        refresh();
      }
    },
    [displayAssets, refresh]
  );

  const inputCls = "admin-input text-sm";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1";

  return (
    <AdminPage>
      <AdminPageHeader
        title="Market Assets"
        description="Institutional-grade control over securities, pricing, returns, branding, and marketplace display order"
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={openCreate} className="admin-btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5">
              <Plus size={14} /> Add Asset
            </button>
            <AdminRefreshButton onClick={refresh} />
          </div>
        }
      />

      {panel && (
        <AdminFormPanel
          title={panel === "create" ? "Create new asset" : `Edit ${form.symbol}`}
          className="overflow-hidden"
        >
          <div className="flex justify-end -mt-2 mb-2">
            <button type="button" onClick={closePanel} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--admin-muted)]">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={saveAsset} className="space-y-6 max-h-[70vh] overflow-y-auto -mx-1 px-1">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--admin-accent)] mb-3">Identity</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {panel === "create" && (
                  <div>
                    <label className={labelCls}>Symbol</label>
                    <input className={inputCls} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="AAPL" required />
                  </div>
                )}
                <div>
                  <label className={labelCls}>Name</label>
                  <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Defaults to symbol" />
                </div>
                <div>
                  <label className={labelCls}>Sector / Category</label>
                  <select className={inputCls} value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className={labelCls}>Description</label>
                  <textarea className={inputCls} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--admin-accent)] mb-3">Pricing & Risk</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={labelCls}>Price (USD)</label>
                  <input className={inputCls} type="number" step="0.01" min="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Defaults to 1.00" />
                </div>
                <div>
                  <label className={labelCls}>Day Change %</label>
                  <input className={inputCls} type="number" step="0.01" value={form.changePercent} onChange={(e) => setForm({ ...form, changePercent: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Min Investment</label>
                  <input className={inputCls} type="number" value={form.minInvestment} onChange={(e) => setForm({ ...form, minInvestment: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Risk Rating</label>
                  <select className={inputCls} value={form.riskRating} onChange={(e) => setForm({ ...form, riskRating: e.target.value as "Low" | "Medium" | "High" })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Expected Return % (p.a.)</label>
                  <input className={inputCls} type="number" step="0.1" value={form.expectedReturnPercent} onChange={(e) => setForm({ ...form, expectedReturnPercent: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Growth Rate %</label>
                  <input className={inputCls} type="number" step="0.01" value={form.growthRate} onChange={(e) => setForm({ ...form, growthRate: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Market Cap Rank</label>
                  <input className={inputCls} type="number" value={form.marketCapRank} onChange={(e) => setForm({ ...form, marketCapRank: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Popularity Score</label>
                  <input className={inputCls} type="number" value={form.popularity} onChange={(e) => setForm({ ...form, popularity: e.target.value })} />
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--admin-accent)]">Holding periods &amp; returns</h3>
                  <p className="text-[11px] text-[var(--admin-muted)] mt-1">
                    Customers pick one of these durations when buying. Return % is the profit they see for that holding period.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1"
                  onClick={() => {
                    const days = 60;
                    const annual = Number(form.expectedReturnPercent) || 8;
                    setForm({
                      ...form,
                      durationPlans: [
                        ...form.durationPlans,
                        {
                          id: newDurationPlanId(),
                          days,
                          label: `${days} Days`,
                          returnPercent: scaleAnnualReturn(annual, days),
                          enabled: true,
                        },
                      ],
                    });
                  }}
                >
                  <Plus size={12} /> Add duration
                </button>
              </div>
              <div className="space-y-2">
                {form.durationPlans.map((plan, index) => (
                  <div
                    key={plan.id}
                    className="grid grid-cols-12 gap-2 items-end rounded-lg border border-white/10 p-2.5"
                  >
                    <label className="col-span-12 sm:col-span-1 flex items-center gap-2 pb-2 text-[11px] text-[var(--admin-muted)]">
                      <input
                        type="checkbox"
                        checked={plan.enabled}
                        onChange={(e) => {
                          const durationPlans = [...form.durationPlans];
                          durationPlans[index] = { ...plan, enabled: e.target.checked };
                          setForm({ ...form, durationPlans });
                        }}
                        className="rounded"
                      />
                      On
                    </label>
                    <div className="col-span-6 sm:col-span-3">
                      <label className={labelCls}>Label</label>
                      <input
                        className={inputCls}
                        value={plan.label}
                        onChange={(e) => {
                          const durationPlans = [...form.durationPlans];
                          durationPlans[index] = { ...plan, label: e.target.value };
                          setForm({ ...form, durationPlans });
                        }}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <label className={labelCls}>Days</label>
                      <input
                        className={inputCls}
                        type="number"
                        min={1}
                        max={3650}
                        value={plan.days}
                        onChange={(e) => {
                          const days = Math.max(1, Math.round(Number(e.target.value) || 1));
                          const durationPlans = [...form.durationPlans];
                          durationPlans[index] = { ...plan, days };
                          setForm({ ...form, durationPlans });
                        }}
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3">
                      <label className={labelCls}>Return %</label>
                      <input
                        className={inputCls}
                        type="number"
                        step="0.01"
                        value={plan.returnPercent}
                        onChange={(e) => {
                          const durationPlans = [...form.durationPlans];
                          durationPlans[index] = {
                            ...plan,
                            returnPercent: Number(e.target.value) || 0,
                          };
                          setForm({ ...form, durationPlans });
                        }}
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-3 flex justify-end pb-0.5">
                      <button
                        type="button"
                        className="admin-btn-ghost text-[11px] px-2 py-1.5 text-red-400"
                        onClick={() =>
                          setForm({
                            ...form,
                            durationPlans: form.durationPlans.filter((_, i) => i !== index),
                          })
                        }
                        disabled={form.durationPlans.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--admin-accent)] mb-3">Branding</h3>
              <div className="grid sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className={labelCls}>Logo Domain</label>
                  <input className={inputCls} value={form.logoDomain} onChange={(e) => setForm({ ...form, logoDomain: e.target.value })} placeholder="apple.com" />
                </div>
                <div>
                  <label className={labelCls}>Custom Logo</label>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                  <button type="button" onClick={() => fileRef.current?.click()} className="admin-btn-ghost text-xs px-3 py-2 inline-flex items-center gap-2 w-full justify-center">
                    <Upload size={14} /> Upload Image
                  </button>
                  {form.logoUrl && (
                    <button type="button" onClick={() => setForm({ ...form, logoUrl: null })} className="text-[10px] text-red-400 mt-1 hover:underline">
                      Remove custom logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <StockIcon symbol={form.symbol || "XX"} name={form.name} logoDomain={form.logoDomain} logoUrl={form.logoUrl} size="lg" />
                  <p className="text-xs text-[var(--admin-muted)]">Preview uses custom upload, then domain favicon, then ticker logo.</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--admin-accent)] mb-3">Display & Status</h3>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
                  <Star size={14} className="text-amber-400" /> Featured
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="rounded" />
                  <Pin size={14} className="text-[var(--admin-accent)]" /> Pinned to top
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
                  <Power size={14} /> Enabled on marketplace
                </label>
              </div>
            </section>

            <div className="flex gap-3 pt-2 border-t border-white/10">
              <button type="submit" disabled={!!busy} className="admin-btn-primary text-sm px-6 py-2.5">
                {busy ? "Saving…" : panel === "create" ? "Create Asset" : "Save Changes"}
              </button>
              <button type="button" onClick={closePanel} className="admin-btn-ghost text-sm px-4 py-2.5">
                Cancel
              </button>
            </div>
          </form>
        </AdminFormPanel>
      )}

      <AdminDataCard noPadding>
        <AdminFetchState loading={loading} error={error} isEmpty={!loading && displayAssets.length === 0} onRetry={refresh} lastUpdated={lastUpdated}>
          <div className="px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--admin-muted)]">
              <GripVertical size={12} className="inline mr-1" />
              Drag rows to reorder · Pinned assets always appear first on the user marketplace
            </p>
            <span className="text-xs text-[var(--admin-muted)]">{displayAssets.length} assets</span>
          </div>
          <AdminTableScroll>
            <table className="admin-table w-full min-w-[1100px]">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Asset</th>
                  <th>Price</th>
                  <th>Durations / Returns</th>
                  <th>Popularity</th>
                  <th>Flags</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayAssets.map((a) => (
                  <tr
                    key={a.id}
                    draggable
                    onDragStart={() => setDragId(a.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragId && dragId !== a.id) void reorder(dragId, a.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "transition-colors",
                      dragId === a.id && "opacity-50",
                      !a.enabled && "opacity-60"
                    )}
                  >
                    <td className="cursor-grab active:cursor-grabbing text-[var(--admin-muted)]">
                      <GripVertical size={16} />
                    </td>
                    <td>
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <StockIcon symbol={a.symbol} name={a.name} logoDomain={a.logoDomain} logoUrl={a.logoUrl} size="sm" />
                        <div>
                          <p className="font-mono font-semibold text-white">{a.symbol}</p>
                          <p className="text-xs text-[var(--admin-muted)] truncate max-w-[160px]">{a.name}</p>
                          <p className="text-[10px] text-[var(--admin-muted)]">{a.sector}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-mono text-sm">{formatCurrency(a.price)}</p>
                      <p className={cn("text-xs font-mono", a.changePercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {a.changePercent >= 0 ? "+" : ""}{a.changePercent.toFixed(2)}%
                      </p>
                    </td>
                    <td className="text-xs font-mono text-[var(--admin-muted)]">
                      {getDurationPlans(a)
                        .filter((p) => p.enabled)
                        .slice(0, 4)
                        .map((p) => `${p.label} ${p.returnPercent.toFixed(1)}%`)
                        .join(" · ") || "—"}
                    </td>
                    <td>{a.popularity}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {a.isPinned && <span className="admin-pill text-[9px]"><Pin size={10} className="inline" /> Pin</span>}
                        {a.isFeatured && <span className="admin-pill text-[9px]"><Star size={10} className="inline" /> Featured</span>}
                      </div>
                    </td>
                    <td>
                      <span className={a.enabled ? "admin-pill" : "admin-pill opacity-50"}>
                        {a.enabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button type="button" title="Edit" onClick={() => openEdit(a)} className="admin-btn-ghost p-2">
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title={a.isPinned ? "Unpin" : "Pin"}
                          disabled={busy === a.id}
                          onClick={() => patchAsset(a.id, { isPinned: !a.isPinned }, a.isPinned ? "Unpinned" : "Pinned to top")}
                          className="admin-btn-ghost p-2"
                        >
                          <Pin size={14} />
                        </button>
                        <button
                          type="button"
                          title={a.isFeatured ? "Unfeature" : "Feature"}
                          disabled={busy === a.id}
                          onClick={() => patchAsset(a.id, { isFeatured: !a.isFeatured }, a.isFeatured ? "Removed from featured" : "Marked featured")}
                          className="admin-btn-ghost p-2"
                        >
                          <Star size={14} />
                        </button>
                        <button
                          type="button"
                          title={a.enabled ? "Disable" : "Enable"}
                          disabled={busy === a.id}
                          onClick={() => patchAsset(a.id, { enabled: !a.enabled }, a.enabled ? "Disabled" : "Enabled")}
                          className="admin-btn-ghost p-2"
                        >
                          {a.enabled ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                        <button type="button" title="Delete" disabled={busy === a.id} onClick={() => deleteAsset(a)} className="admin-btn-ghost p-2 text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        </AdminFetchState>
      </AdminDataCard>
    </AdminPage>
  );
}
