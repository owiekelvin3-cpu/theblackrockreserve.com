"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getGreetingPeriod, type GreetingPeriod } from "@/lib/greeting";
import { getLocaleDefinition, type LocaleCode } from "@/lib/i18n/locales";

export type LiveClockState = {
  greeting: string;
  period: GreetingPeriod;
  dateLine: string;
  timeLine: string;
  timezone: string;
  locale: string;
};

function resolveBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getHourInTimezone(now: Date, timezone: string, locale: string): number {
  try {
    const parts = new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    if (Number.isFinite(hour)) return hour === 24 ? 0 : hour;
  } catch {
    /* fall through */
  }
  return now.getHours();
}

function formatClock(now: Date, timezone: string, bcp47: string) {
  const dateLine = new Intl.DateTimeFormat(bcp47, {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  const timeLine = new Intl.DateTimeFormat(bcp47, {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);

  const hour = getHourInTimezone(now, timezone, bcp47);
  return { dateLine, timeLine, hour };
}

const GREETING_KEYS: Record<GreetingPeriod, string> = {
  morning: "dashboard.greetingMorning",
  afternoon: "dashboard.greetingAfternoon",
  evening: "dashboard.greetingEvening",
  night: "dashboard.greetingNight",
};

function buildGreeting(
  period: GreetingPeriod,
  firstName: string | null,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (!firstName) return t("dashboard.welcomeBack");
  const label = t(GREETING_KEYS[period]);
  return `${label}, ${firstName} 👋`;
}

function buildState(
  now: Date,
  timezone: string,
  localeCode: LocaleCode,
  firstName: string | null,
  t: (key: string, vars?: Record<string, string | number>) => string
): LiveClockState {
  const bcp47 = getLocaleDefinition(localeCode).bcp47;
  const { dateLine, timeLine, hour } = formatClock(now, timezone, bcp47);
  const period = getGreetingPeriod(hour);
  return {
    greeting: buildGreeting(period, firstName, t),
    period,
    dateLine,
    timeLine,
    timezone,
    locale: bcp47,
  };
}

export function useLiveClock(
  firstName: string | null,
  localeCode: LocaleCode,
  t: (key: string, vars?: Record<string, string | number>) => string
) {
  const timezone = useMemo(() => resolveBrowserTimezone(), []);
  const firstNameRef = useRef(firstName);
  firstNameRef.current = firstName;

  const [clock, setClock] = useState<LiveClockState | null>(null);

  useEffect(() => {
    firstNameRef.current = firstName;
  }, [firstName]);

  useEffect(() => {
    const tick = () => {
      setClock(buildState(new Date(), timezone, localeCode, firstNameRef.current, t));
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [timezone, localeCode, firstName, t]);

  return { clock, timezone, locale: getLocaleDefinition(localeCode).bcp47, ready: clock !== null };
}
