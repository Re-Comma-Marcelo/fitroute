/** Tracks when the user last exported a backup, to nudge once a month. */

const KEY = "forja.lastBackup.v1";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function markBackupExported() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, new Date().toISOString());
}

export function lastBackupAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

/** True when there is no backup on record, or the last one is over a month old. */
export function backupIsStale(now = Date.now()): boolean {
  const last = lastBackupAt();
  if (!last) return true;
  const time = new Date(last).getTime();
  if (Number.isNaN(time)) return true;
  return now - time > MONTH_MS;
}
