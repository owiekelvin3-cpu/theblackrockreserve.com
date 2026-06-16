"use client";

import { useEffect } from "react";

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function dismissInlineSplash() {
  document.documentElement.classList.add("app-ready");
  window.setTimeout(() => {
    document.getElementById("app-splash")?.remove();
  }, 420);
}

/** Keeps the launch splash visible briefly when opened from the home-screen app icon. */
export default function AppLaunchSplash() {
  useEffect(() => {
    if (!isStandaloneDisplay()) {
      dismissInlineSplash();
      return;
    }

    const startedAt = performance.now();
    const minVisibleMs = 900;

    const finish = () => {
      const elapsed = performance.now() - startedAt;
      const delay = Math.max(0, minVisibleMs - elapsed);
      window.setTimeout(dismissInlineSplash, delay);
    };

    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
      return () => window.removeEventListener("load", finish);
    }
  }, []);

  return null;
}
