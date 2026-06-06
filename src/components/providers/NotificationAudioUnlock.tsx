"use client";

import { useEffect } from "react";
import { unlockNotificationAudio } from "@/lib/notification-sound";

/** Ensures notification sounds can play after the first user interaction */
export default function NotificationAudioUnlock() {
  useEffect(() => {
    unlockNotificationAudio();
  }, []);

  return null;
}
