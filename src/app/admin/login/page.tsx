"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { LogoMark } from "@/components/layout/Logo";
import { useI18n } from "@/components/providers/I18nProvider";
import LanguageSelector from "@/components/ui/LanguageSelector";
import { waitForSessionRole } from "@/lib/auth-session-client";

function LoginForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [authReady, setAuthReady] = useState(true);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setAuthReady(Boolean(data?.auth?.configured)))
      .catch(() => setAuthReady(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authReady) return;

    setLoading(true);
    setFormError("");

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError(
          result.error === "Configuration"
            ? t("admin.configError")
            : t("admin.invalidCredentials")
        );
        return;
      }

      const session = await waitForSessionRole("ADMIN");
      if (session?.user?.role !== "ADMIN") {
        await signOut({ redirect: false });
        setFormError(t("admin.accessDenied"));
        return;
      }

      window.location.assign("/admin");
    } catch {
      setFormError(t("admin.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-5 right-4 z-20">
        <LanguageSelector variant="compact" />
      </div>
      <div className="admin-horizon top-[20%]" />

      <div className="admin-card admin-card-glow w-full max-w-md p-8 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <LogoMark size="md" className="rounded-xl" />
          <div>
            <h1 className="text-lg font-bold text-white">
              {t("admin.consoleTitle")} <span className="gold-gradient-text">{t("admin.consoleHighlight")}</span>
            </h1>
            <p className="text-xs text-[var(--admin-muted)]">{t("admin.consoleSubtitle")}</p>
          </div>
        </div>

        {!authReady && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm mb-6">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>
              Sign-in is unavailable. Add <strong>NEXTAUTH_SECRET</strong> (32+ chars) and{" "}
              <strong>NEXTAUTH_URL=https://theblackrockreserve-com.vercel.app</strong> in Vercel, then redeploy.
            </p>
          </div>
        )}

        {(error === "not_admin" || error === "session_timeout" || formError) && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm mb-6">
            <AlertCircle size={16} />
            {formError ||
              (error === "session_timeout"
                ? "Your session could not be verified. Please sign in again."
                : t("admin.notAdminAccess"))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">{t("admin.adminEmailLabel")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="admin-input"
              placeholder="admin@blackrockreserve.site"
              autoComplete="username"
              required
              disabled={!authReady || loading}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">{t("admin.loginPassword")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="admin-input pr-11 w-full"
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                minLength={8}
                disabled={!authReady || loading}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--admin-muted)] hover:text-white transition-colors"
                aria-label={showPassword ? t("admin.hidePassword") : t("admin.showPassword")}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!authReady || loading}
            className="admin-btn-primary w-full mt-2 disabled:opacity-50"
          >
            {loading ? t("admin.signingIn") : t("admin.loginSubmit")}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--admin-muted)] mt-6">
          <Link href="/" className="admin-link">← {t("admin.loginBack")}</Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[var(--admin-muted)]">…</div>}>
      <LoginForm />
    </Suspense>
  );
}
