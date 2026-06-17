/** Lightweight notification chime via Web Audio — no external asset required */

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Call once on app load — browsers require a user gesture before audio plays */
export function unlockNotificationAudio() {
  if (typeof window === "undefined" || audioUnlocked) return;

  const tryUnlock = async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
      audioUnlocked = ctx.state === "running";
    } catch {
      /* wait for user gesture */
    }
  };

  void tryUnlock();

  const onGesture = () => {
    void tryUnlock().then(() => {
      if (audioUnlocked) {
        window.removeEventListener("click", onGesture);
        window.removeEventListener("keydown", onGesture);
        window.removeEventListener("touchstart", onGesture);
      }
    });
  };

  window.addEventListener("click", onGesture, { passive: true });
  window.addEventListener("keydown", onGesture, { passive: true });
  window.addEventListener("touchstart", onGesture, { passive: true });
}

export async function playNotificationSound(variant: "default" | "success" | "alert" = "default") {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") await ctx.resume();
    if (ctx.state !== "running") return;
  } catch {
    return;
  }

  const frequencies =
    variant === "success"
      ? [523.25, 659.25, 783.99]
      : variant === "alert"
        ? [440, 330]
        : [587.33, 739.99];

  const volume = variant === "success" ? 0.18 : 0.14;

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime + i * 0.1;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);

    osc.start(start);
    osc.stop(start + 0.42);
  });
}

export async function ensureBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function showBrowserNotification(title: string, body: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  try {
    new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
  } catch {
    /* ignore unsupported environments */
  }
}
