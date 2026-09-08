/**
 * Local workout reminder. Fires a notification at the chosen time on days a
 * routine is planned, while the app is open or installed. No server push:
 * the schedule lives in localStorage and is re-armed on every app load.
 */

import { notificationsSupported } from "@/lib/rest-notification";
import type { Routine } from "@/lib/types";

const KEY = "forja.reminder.v1";
const FIRED_KEY = "forja.reminder.fired.v1";
const CHECKIN_FIRED_KEY = "forja.reminder.checkin.v1";

export interface ReminderSettings {
  enabled: boolean;
  /** "HH:MM" local time. */
  time: string;
}

const DEFAULT: ReminderSettings = { enabled: false, time: "18:00" };

export function getReminder(): ReminderSettings {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      time: typeof parsed.time === "string" ? parsed.time : DEFAULT.time,
    };
  } catch {
    return DEFAULT;
  }
}

export function setReminder(next: ReminderSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

/** Ask for permission on a real user gesture, then persist the schedule. */
export async function enableReminder(time: string): Promise<boolean> {
  if (!notificationsSupported()) return false;
  let granted = Notification.permission === "granted";
  if (!granted && Notification.permission !== "denied") {
    try {
      granted = (await Notification.requestPermission()) === "granted";
    } catch {
      granted = false;
    }
  }
  if (!granted) return false;
  setReminder({ enabled: true, time });
  return true;
}

function todayKey(): string {
  return new Date().toDateString();
}

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Arms a one-shot timer for today's reminder. Safe to call repeatedly.
 * Returns a cleanup function.
 */
export function armReminder(routines: Routine[], message: (routineName: string) => string) {
  if (timer) clearTimeout(timer);
  timer = null;
  if (typeof window === "undefined") return () => {};

  const settings = getReminder();
  if (!settings.enabled || !notificationsSupported() || Notification.permission !== "granted") {
    return () => {};
  }
  if (window.localStorage.getItem(FIRED_KEY) === todayKey()) return () => {};

  const now = new Date();
  const planned = routines.find((r) => (r.diasSemana ?? []).includes(now.getDay()));
  if (!planned) return () => {};

  const [hh, mm] = settings.time.split(":");
  const at = new Date(now);
  at.setHours(Number(hh ?? 18), Number(mm ?? 0), 0, 0);
  const delay = at.getTime() - now.getTime();
  // Only future times today, and never more than ~12h out (timer precision).
  if (delay <= 0 || delay > 12 * 60 * 60 * 1000) return () => {};

  timer = setTimeout(() => {
    try {
      window.localStorage.setItem(FIRED_KEY, todayKey());
      new Notification(message(planned.nome), { tag: "forja-reminder", icon: "/icon-192.png" });
    } catch {
      // notification failures are non-critical
    }
  }, delay);

  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
}

let checkinTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * One nudge per weekend to plan the coming week. Uses the same reminder
 * setting and time as the training reminder, and only fires on Sunday or
 * Monday while the check-in for that week is still open.
 */
export function armWeeklyCheckInReminder(due: boolean, message: string) {
  if (checkinTimer) clearTimeout(checkinTimer);
  checkinTimer = null;
  if (typeof window === "undefined" || !due) return () => {};

  const settings = getReminder();
  if (!settings.enabled || !notificationsSupported() || Notification.permission !== "granted") {
    return () => {};
  }
  if (window.localStorage.getItem(CHECKIN_FIRED_KEY) === todayKey()) return () => {};

  const now = new Date();
  const [hh, mm] = settings.time.split(":");
  const at = new Date(now);
  at.setHours(Number(hh ?? 18), Number(mm ?? 0), 0, 0);
  const delay = at.getTime() - now.getTime();
  if (delay <= 0 || delay > 12 * 60 * 60 * 1000) return () => {};

  checkinTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(CHECKIN_FIRED_KEY, todayKey());
      new Notification(message, { tag: "forja-weekly-checkin", icon: "/icon-192.png" });
    } catch {
      // notification failures are non-critical
    }
  }, delay);

  return () => {
    if (checkinTimer) clearTimeout(checkinTimer);
    checkinTimer = null;
  };
}
