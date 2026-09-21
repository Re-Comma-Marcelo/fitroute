/**
 * Rest that reaches the user even when the screen is locked or the app is in
 * the background. Notifications are opt-in and degrade to the in-app timer.
 *
 * Exactly one notification per rest, when the countdown ends, with sound and
 * vibration. Nothing is shown while the rest runs: the previous live lock-screen
 * countdown had to re-post the banner every few seconds, which iOS surfaces as a
 * new alert each time.
 *
 * Two layers: the service worker owns the alarm (survives a frozen tab), and a
 * page timer is kept as a fallback for browsers without an active worker.
 */

import { playRestBeep } from "./rest-audio";

const ASKED_KEY = "forja.restNotifyAsked.v1";
const ENABLED_KEY = "forja.restNotify.v1";

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export function restNotifyEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (notificationPermission() !== "granted") return false;
  return window.localStorage.getItem(ENABLED_KEY) !== "off";
}

export function setRestNotifyEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ENABLED_KEY, enabled ? "on" : "off");
}

/** True when the browser can still show the permission prompt. */
export function canAskRestPermission(): boolean {
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "default") return false;
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ASKED_KEY) !== "yes";
}

/** Remember a "not now" so the app never nags again. */
export function declineRestPermission() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ASKED_KEY, "yes");
}

/** Ask once, on a real user gesture. Returns whether we can notify. */
export async function ensureRestPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  if (typeof window !== "undefined" && window.localStorage.getItem(ASKED_KEY) === "yes") {
    return false;
  }
  if (typeof window !== "undefined") window.localStorage.setItem(ASKED_KEY, "yes");
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;
let beepHooked = false;

function worker(): ServiceWorker | null {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.controller ?? null;
}

/**
 * The worker beeps through the page when the alarm fires, so a tab that was
 * throttled (and whose own timer ran late) still makes a sound.
 */
function hookBeep() {
  if (beepHooked) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  beepHooked = true;
  navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
    if ((event.data as { type?: string } | null)?.type === "rest-done") playRestBeep();
  });
}

/**
 * Browsers recycle an idle service worker, which would drop the pending alarm.
 * A ping while the page is awake wakes it back up and re-arms it from the
 * deadline it persisted.
 */
function startHeartbeat() {
  stopHeartbeat();
  if (typeof window === "undefined") return;
  heartbeat = setInterval(() => {
    worker()?.postMessage({ type: "rest-ping" });
  }, 15000);
}

function stopHeartbeat() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
}

async function showNow(title: string, body: string) {
  try {
    const registration =
      typeof navigator !== "undefined" && "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration()
        : null;
    const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
      body,
      tag: "forja-rest",
      renotify: true,
      silent: false,
      requireInteraction: true,
      icon: "/icon-192.png",
      vibrate: [400, 150, 400, 150, 600],
    };
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    // ignore
  }
}

/**
 * Fire a single notification when the rest ends, unless cancelled first.
 * Nothing is shown while the countdown runs.
 */
export function scheduleRestNotification(msFromNow: number, title: string, body: string) {
  cancelRestNotification();
  if (msFromNow <= 0 || !restNotifyEnabled()) return;
  const endsAt = Date.now() + msFromNow;
  const sw = worker();
  if (sw) {
    hookBeep();
    sw.postMessage({ type: "rest-schedule", endsAt, title, body, url: "/sessao" });
    startHeartbeat();
    return;
  }
  timer = setTimeout(() => {
    timer = null;
    playRestBeep();
    // Only useful when the user is not already looking at the timer.
    if (typeof document !== "undefined" && document.visibilityState === "visible") return;
    void showNow(title, body);
  }, msFromNow);
}

export function cancelRestNotification() {
  if (timer) clearTimeout(timer);
  timer = null;
  stopHeartbeat();
  worker()?.postMessage({ type: "rest-cancel" });
}
