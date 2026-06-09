"use client";

import { useState, Suspense } from "react";
import { signIn, signOut, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, AlertCircle } from "lucide-react";

async function waitForAdminSession(maxAttempts = 8) {
  for (let i = 0; i < maxAttempts; i++) {
    const session = await getSession();
    if (session?.user?.role === "ADMIN") return session;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return getSession();
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("admin@blackrockreserve.com");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError("");

    try {
      const existing = await getSession();
      if (existing?.user?.role !== "ADMIN") {
        await signOut({ redirect: false });
      }

      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: "admin-passwordless",
        redirect: false,
      });

      if (result?.error) {
        setFormError("Could not sign in. Check the admin email.");
        return;
      }

      const session = await waitForAdminSession();

      if (session?.user?.role !== "ADMIN") {
        await signOut({ redirect: false });
        setFormError("Access denied. Admin account required.");
        return;
      }

      router.push("/admin");
      router.refresh();
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
            <p className="text-xs text-[var(--admin-muted)]">Blackrock Reserve — Internal Access</p>
          </div>
        </div>

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
              placeholder="admin@blackrockreserve.com"
              autoComplete="email"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="admin-btn-primary w-full mt-2 disabled:opacity-50">
            {loading ? "Signing in..." : "Enter Admin Console"}
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
