/**
 * Rest that reaches the user even when the screen is locked or the app is in
 * the background. Notifications are opt-in and degrade to the in-app timer.
 */

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

/** Fire a notification when the rest ends, unless cancelled first. */
export function scheduleRestNotification(msFromNow: number, title: string, body: string) {
  cancelRestNotification();
  if (msFromNow <= 0 || !restNotifyEnabled()) return;
  timer = setTimeout(() => {
    timer = null;
    // Only useful when the user is not already looking at the timer.
    if (typeof document !== "undefined" && document.visibilityState === "visible") return;
    try {
      new Notification(title, { body, tag: "forja-rest", icon: "/icon-192.png" });
    } catch {
      // ignore
    }
  }, msFromNow);
}

export function cancelRestNotification() {
  if (timer) clearTimeout(timer);
  timer = null;
}
