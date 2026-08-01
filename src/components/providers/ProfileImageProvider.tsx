"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import type { VerificationBadgeType } from "@/lib/verification-badge";
import { serializeVerificationBadge } from "@/lib/verification-badge";

type ProfileImageContextValue = {
  image: string | null;
  verificationBadge: VerificationBadgeType;
  loading: boolean;
  refresh: () => Promise<void>;
  setImage: (url: string | null) => void;
};

const ProfileImageContext = createContext<ProfileImageContextValue | null>(null);

export function ProfileImageProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [image, setImage] = useState<string | null>(null);
  const [verificationBadge, setVerificationBadge] = useState<VerificationBadgeType>("NONE");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setImage(null);
      setVerificationBadge("NONE");
      return;
    }
    setLoading(true);
    try {
      const [imageRes, prefsRes] = await Promise.all([
        fetch("/api/dashboard/profile/image", { cache: "no-store" }),
        fetch("/api/dashboard/preferences", { cache: "no-store" }),
      ]);

      if (imageRes.ok) {
        const data = (await imageRes.json()) as { image?: string | null };
        setImage(data.image ?? null);
      }

      if (prefsRes.ok) {
        const prefs = (await prefsRes.json()) as { verificationBadge?: string };
        setVerificationBadge(serializeVerificationBadge(prefs.verificationBadge));
      }
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [status, refresh]);

  return (
    <ProfileImageContext.Provider value={{ image, verificationBadge, loading, refresh, setImage }}>
      {children}
    </ProfileImageContext.Provider>
  );
}

export function useProfileImage() {
  const ctx = useContext(ProfileImageContext);
  if (!ctx) {
    return {
      image: null as string | null,
      verificationBadge: "NONE" as VerificationBadgeType,
      loading: false,
      refresh: async () => {},
      setImage: () => {},
    };
  }
  return ctx;
}
