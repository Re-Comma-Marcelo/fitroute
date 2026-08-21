export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatDurationShort(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}min`;
}

/** Human-readable rest: "2min 15s", "45s", "3min". */
export function formatRest(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  if (sec === 0) return `${m}min`;
  return `${m}min ${sec}s`;
}

const dtf = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
});

export function formatDate(iso: string): string {
  return dtf.format(new Date(iso));
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function relativeDays(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export function formatKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString("en-US")} kg`;
}
