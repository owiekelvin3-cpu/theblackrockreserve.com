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

type ProfileImageContextValue = {
  image: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setImage: (url: string | null) => void;
};

const ProfileImageContext = createContext<ProfileImageContextValue | null>(null);

export function ProfileImageProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") {
      setImage(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/profile/image", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { image?: string | null };
        setImage(data.image ?? null);
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

  return (
    <ProfileImageContext.Provider value={{ image, loading, refresh, setImage }}>
      {children}
    </ProfileImageContext.Provider>
  );
}

export function useProfileImage() {
  const ctx = useContext(ProfileImageContext);
  if (!ctx) {
    return {
      image: null as string | null,
      loading: false,
      refresh: async () => {},
      setImage: () => {},
    };
  }
  return ctx;
}
