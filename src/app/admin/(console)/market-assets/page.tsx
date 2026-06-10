"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminUi";
import AdminFetchState from "@/components/admin/AdminFetchState";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { formatCurrency } from "@/lib/utils";

interface AssetRow {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePercent: number;
  minInvestment: number;
  riskRating: string;
  expectedReturnPercent: number;
  marketCapRank: number;
  popularity: number;
  enabled: boolean;
}

export default function AdminMarketAssetsPage() {
  const { data, error, loading, refresh, lastUpdated } = useAdminFetch<{ assets: AssetRow[] }>(
    "/api/admin/market-assets"
  );
  const assets = data?.assets ?? [];
  const [updating, setUpdating] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    symbol: "",
    name: "",
    sector: "Technology",
    description: "",
    logoDomain: "",
    price: "",
    minInvestment: "100",
    riskRating: "Medium",
    expectedReturnPercent: "8",
  });

  const toggleEnabled = async (asset: AssetRow) => {
    setUpdating(asset.id);
    try {
      const res = await fetch(`/api/admin/market-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !asset.enabled }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      toast.success(asset.enabled ? `${asset.symbol} disabled` : `${asset.symbol} enabled`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setUpdating(null);
    }
  };

  const createAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.symbol.trim() || !form.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error("Symbol, name, and valid price are required");
      return;
    }
    setUpdating("create");
    try {
      const res = await fetch("/api/admin/market-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          symbol: form.symbol.toUpperCase(),
          name: form.name,
          sector: form.sector,
          description: form.description || `${form.name} equity security.`,
          logoDomain: form.logoDomain || undefined,
          price,
          minInvestment: Number(form.minInvestment) || 100,
          riskRating: form.riskRating,
          expectedReturnPercent: Number(form.expectedReturnPercent) || 8,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Create failed");
      toast.success(`${form.symbol.toUpperCase()} added`);
      setShowForm(false);
      setForm({ symbol: "", name: "", sector: "Technology", description: "", logoDomain: "", price: "", minInvestment: "100", riskRating: "Medium", expectedReturnPercent: "8" });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Market Assets"
        description="Manage investment securities — enable, disable, or add new assets to the Capital Markets marketplace"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm((v) => !v)} className="admin-btn-primary text-xs px-4 py-2">
              {showForm ? "Cancel" : "Add Asset"}
            </button>
            <button type="button" onClick={refresh} className="admin-btn-ghost text-xs px-4 py-2">
              Refresh
            </button>
          </div>
        }
      />

      {showForm && (
        <form onSubmit={createAsset} className="admin-card p-5 mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <input className="admin-input" placeholder="Symbol (e.g. AAPL)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} required />
          <input className="admin-input" placeholder="Company name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="admin-input" placeholder="Sector" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
          <input className="admin-input" placeholder="Price (USD)" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input className="admin-input" placeholder="Min investment" type="number" value={form.minInvestment} onChange={(e) => setForm({ ...form, minInvestment: e.target.value })} />
          <input className="admin-input" placeholder="Logo domain (e.g. apple.com)" value={form.logoDomain} onChange={(e) => setForm({ ...form, logoDomain: e.target.value })} />
          <textarea className="admin-input sm:col-span-2 lg:col-span-3" placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" disabled={updating === "create"} className="admin-btn-primary text-sm px-4 py-2 sm:col-span-2 lg:col-span-1">
            Create Asset
          </button>
        </form>
      )}

      <AdminFetchState loading={loading} error={error} isEmpty={!loading && assets.length === 0} onRetry={refresh} lastUpdated={lastUpdated}>
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Sector</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Min</th>
                  <th>Risk</th>
                  <th>Popularity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td className="font-mono font-semibold">{a.symbol}</td>
                    <td>{a.name}</td>
                    <td className="text-[var(--admin-muted)]">{a.sector}</td>
                    <td className="font-mono">{formatCurrency(a.price)}</td>
                    <td className={a.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {a.changePercent >= 0 ? "+" : ""}
                      {a.changePercent.toFixed(2)}%
                    </td>
                    <td className="font-mono">{formatCurrency(a.minInvestment)}</td>
                    <td>{a.riskRating}</td>
                    <td>{a.popularity}</td>
                    <td>
                      <span className={a.enabled ? "admin-pill" : "admin-pill opacity-50"}>
                        {a.enabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={updating === a.id}
                        onClick={() => toggleEnabled(a)}
                        className="admin-btn-ghost text-xs px-3 py-1.5"
                      >
                        {a.enabled ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminFetchState>
    </div>
  );
}
