"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Check, Clock, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useI18n } from "@/components/providers/I18nProvider";

type KycStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";

type KycState = {
  required: boolean;
  status: KycStatus;
  blocking: boolean;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  country: string;
  address: string;
  idType: string;
  idNumber: string;
};

const ID_TYPES = [
  { value: "NATIONAL_ID", labelKey: "auth.kycNationalId" },
  { value: "PASSPORT", labelKey: "auth.kycPassport" },
  { value: "DRIVERS_LICENSE", labelKey: "auth.kycDriversLicense" },
] as const;

async function fileToDataUrl(file: File) {
  if (file.size > 2_500_000) {
    throw new Error("Image must be under 2.5 MB.");
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export default function KycPanel() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, setState] = useState<KycState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<{ front?: string; back?: string }>({});
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    dateOfBirth: "",
    country: "",
    address: "",
    idType: "NATIONAL_ID",
    idNumber: "",
  });

  const load = async () => {
    const res = await fetch("/api/kyc", { credentials: "include", cache: "no-store" });
    if (res.status === 401) {
      router.replace("/login?callbackUrl=/kyc&error=sign_in_required");
      return null;
    }
    if (!res.ok) throw new Error("Failed to load verification status");
    return (await res.json()) as KycState;
  };

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => {
        if (cancelled || !data) return;
        if (!data.required || data.status === "VERIFIED") {
          router.replace("/dashboard");
          return;
        }
        setState(data);
        setForm({
          fullName: data.name,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth,
          country: data.country,
          address: data.address,
          idType: data.idType || "NATIONAL_ID",
          idNumber: data.idNumber,
        });
      })
      .catch(() => toast.error(t("auth.kycLoadFailed")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router, t]);

  useEffect(() => {
    if (state?.status !== "SUBMITTED") return;
    const timer = window.setInterval(() => {
      load()
        .then((data) => {
          if (!data) return;
          if (data.status === "VERIFIED") {
            setState(data);
            window.setTimeout(() => router.replace("/dashboard"), 1600);
            return;
          }
          if (data.status === "REJECTED") setState(data);
        })
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [state?.status, router]);

  const upload = async (side: "front" | "back", file?: File) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setFiles((prev) => ({ ...prev, [side]: dataUrl }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.kycUploadFailed"));
    }
  };

  const submit = async () => {
    if (!files.front) {
      toast.error(t("auth.kycFrontRequired"));
      return;
    }
    if (form.idType !== "PASSPORT" && !files.back) {
      toast.error(t("auth.kycBackRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          idFront: files.front,
          idBack: files.back ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.kycSubmitFailed"));
      setState((prev) =>
        prev ? { ...prev, status: "SUBMITTED", blocking: true } : prev
      );
      toast.success(t("auth.kycInProgressTitle"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.kycSubmitFailed"));
    } finally {
      setSaving(false);
    }
  };

  const heading = useMemo(() => {
    if (state?.status === "SUBMITTED") return t("auth.kycInProgressTitle");
    if (state?.status === "VERIFIED") return t("auth.kycApprovedTitle");
    if (state?.status === "REJECTED") return t("auth.kycRejectedTitle");
    return t("auth.kycTitle");
  }, [state?.status, t]);

  if (loading || !state) {
    return (
      <Card>
        <p className="text-sm text-text-secondary text-center">{t("common.loading")}</p>
      </Card>
    );
  }

  if (state.status === "VERIFIED") {
    return (
      <Card>
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="h-14 w-14 rounded-full bg-accent-green/15 text-accent-green flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{t("auth.kycApprovedTitle")}</h1>
          <p className="text-sm text-text-secondary">{t("auth.kycApprovedDesc")}</p>
        </div>
      </Card>
    );
  }

  if (state.status === "SUBMITTED") {
    return (
      <Card>
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <div className="h-14 w-14 rounded-full bg-accent-gold/15 text-accent-gold flex items-center justify-center">
            <Clock size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-text-primary">{heading}</h1>
          <p className="text-sm text-text-secondary">{t("auth.kycInProgressDesc")}</p>
          <p className="text-xs text-text-muted">{state.email}</p>
          <Button variant="ghost" className="mt-2" onClick={() => signOut({ callbackUrl: "/login" })}>
            {t("common.signOut")}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold text-text-primary text-center">{heading}</h1>
      <p className="text-sm text-text-secondary text-center mt-2">
        {state.status === "REJECTED" ? t("auth.kycRejectedDesc") : t("auth.kycSubtitle")}
      </p>

      <div className="mt-8 space-y-4">
        <Input
          label={t("auth.fullName")}
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <Input
          label={t("auth.phone")}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Input
          label={t("auth.dateOfBirth")}
          type="date"
          value={form.dateOfBirth}
          onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
        />
        <Input
          label={t("auth.kycCountry")}
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
        />
        <Input
          label={t("auth.kycAddress")}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">{t("auth.kycIdType")}</label>
          <select
            value={form.idType}
            onChange={(e) => setForm({ ...form, idType: e.target.value })}
            className="w-full rounded-xl border border-border bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-gold/40"
          >
            {ID_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <Input
          label={t("auth.kycIdNumber")}
          value={form.idNumber}
          onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
        />

        {(["front", "back"] as const).map((side) => {
          if (side === "back" && form.idType === "PASSPORT") return null;
          return (
            <label key={side} className="block">
              <span className="text-sm font-medium text-text-secondary mb-2 block">
                {side === "front" ? t("auth.idFront") : t("auth.idBack")}
              </span>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-accent-gold/40 transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void upload(side, e.target.files?.[0])}
                />
                {files[side] ? (
                  <div className="flex items-center justify-center gap-2 text-accent-green">
                    <Check size={20} /> {t("auth.uploaded")}
                  </div>
                ) : (
                  <div className="text-text-muted">
                    <Upload size={24} className="mx-auto mb-2" />
                    <p className="text-sm">{t("auth.clickUpload")}</p>
                  </div>
                )}
              </div>
            </label>
          );
        })}

        <Button onClick={() => void submit()} isLoading={saving} className="w-full">
          {t("auth.kycSubmit")}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-text-muted hover:text-text-secondary"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          {t("common.signOut")}
        </button>
      </div>
    </Card>
  );
}
