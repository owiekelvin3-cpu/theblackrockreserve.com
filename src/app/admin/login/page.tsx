"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, signOut, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, AlertCircle, Eye, EyeOff } from "lucide-react";

async function waitForAdminSession(maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i++) {
    const session = await getSession();
    if (session?.user?.role === "ADMIN") return session;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return getSession();
}

function LoginForm() {
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
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setFormError(
          result.error === "Configuration"
            ? "Sign-in is unavailable. Set NEXTAUTH_SECRET and NEXTAUTH_URL in Vercel, then redeploy."
            : "Invalid email or password."
        );
        return;
      }

      const session = await waitForAdminSession();
      if (session?.user?.role !== "ADMIN") {
        await signOut({ redirect: false });
        setFormError("Access denied. Admin account required.");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="admin-horizon top-[20%]" />

      <div className="admin-card admin-card-glow w-full max-w-md p-8 relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl brand-gradient-bg flex items-center justify-center shadow-brand">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Admin <span className="gold-gradient-text">Console</span>
            </h1>
            <p className="text-xs text-[var(--admin-muted)]">Blackrock Reserve — Authorized access only</p>
          </div>
        </div>

        {!authReady && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm mb-6">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>
              Sign-in is unavailable. Add <strong>NEXTAUTH_SECRET</strong> (32+ chars) and{" "}
              <strong>NEXTAUTH_URL=https://www.blackrockreserve.site</strong> in Vercel, then redeploy.
            </p>
          </div>
        )}

        {(error === "not_admin" || formError) && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-accent-red/10 border border-accent-red/20 text-accent-red text-sm mb-6">
            <AlertCircle size={16} />
            {formError || "You do not have admin access."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Admin email</label>
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
            <label className="block text-xs font-medium text-[var(--admin-muted)] mb-1.5">Password</label>
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
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            {loading ? "Signing in…" : "Sign in to Admin"}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--admin-muted)] mt-6">
          <Link href="/" className="admin-link">← Back to customer website</Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[var(--admin-muted)]">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
