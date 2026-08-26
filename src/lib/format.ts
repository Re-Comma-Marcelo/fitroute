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

let currentLocale = "en-US";
let translator: (source: string, vars?: Record<string, string | number>) => string = (
  source,
  vars,
) => (vars ? source.replace(/\{(\w+)\}/g, (m, k: string) => String(vars[k] ?? m)) : source);

/** Set by the language provider so dates/numbers follow the active language. */
export function setFormatLocale(
  locale: string,
  translate?: (source: string, vars?: Record<string, string | number>) => string,
) {
  currentLocale = locale;
  if (translate) translator = translate;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(currentLocale, {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat(currentLocale, {
    weekday: "short",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function relativeDays(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return translator("today");
  if (days === 1) return translator("yesterday");
  if (days < 7) return translator("{days} days ago", { days });
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? translator("1 week ago") : translator("{weeks} weeks ago", { weeks });
}

export function formatKg(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString(currentLocale)} kg`;
}

/** Active locale, for the rare caller that needs Intl directly. */
export function activeLocale(): string {
  return currentLocale;
}

/**
 * Translate outside React (data layer, pure modules). The provider injects the
 * active language, so generated copy follows the user's choice.
 */
export function tx(source: string, vars?: Record<string, string | number>): string {
  return translator(source, vars);
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return value.toLocaleString(currentLocale, { maximumFractionDigits });
}

/** "HH:MM" (24h/12h per locale) from a stored "08:00" string. */
export function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return new Intl.DateTimeFormat(currentLocale, { hour: "2-digit", minute: "2-digit" }).format(d);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatWeekdayShort(value: Date | string): string {
  return new Intl.DateTimeFormat(currentLocale, { weekday: "short" }).format(asDate(value));
}

export function formatWeekdayDayMonth(value: Date | string): string {
  return new Intl.DateTimeFormat(currentLocale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(asDate(value));
}

export function formatDayMonth(value: Date | string): string {
  return new Intl.DateTimeFormat(currentLocale, { day: "2-digit", month: "short" }).format(
    asDate(value),
  );
}

export function formatMonthYear(value: Date | string): string {
  return new Intl.DateTimeFormat(currentLocale, { month: "short", year: "numeric" }).format(
    asDate(value),
  );
}

export function formatFullDate(value: Date | string): string {
  return new Intl.DateTimeFormat(currentLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(asDate(value));
}

export function formatDateNumeric(value: Date | string): string {
  return new Intl.DateTimeFormat(currentLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(asDate(value));
}
