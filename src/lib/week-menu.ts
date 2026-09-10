/**
 * Weekly meal selection ("this week on the menu") — local-first.
 *
 * The shopping list belongs to a week: at the start of a new week the previous
 * selection plus its checked items are archived and the active list is empty
 * until the user picks meals again. Stored in localStorage so it works without
 * the optional `week_menu` table (scripts/supabase-migration-week-menu.sql).
 */

export interface WeekMenu {
  /** ISO date of the Monday that starts the week. */
  weekStart: string;
  mealIds: string[];
  /** Shopping-list rows the user removed by hand (key = "name|unit"). */
  removedKeys: string[];
  completedAt?: string;
}

export interface ArchivedWeek {
  weekStart: string;
  mealIds: string[];
  checked: string[];
  archivedAt: string;
}

interface Store {
  active?: WeekMenu;
  archive?: ArchivedWeek[];
}

const KEY = "forja.weekMenu.v1";

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-based start of the week containing `ref`. */
export function currentWeekStart(ref = new Date()): string {
  const base = new Date(ref);
  base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  return isoDay(base);
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

function empty(weekStart: string): WeekMenu {
  return { weekStart, mealIds: [], removedKeys: [] };
}

/**
 * Rolls the week over when needed: the finished week is archived (never just
 * deleted) and the active selection starts empty.
 */
export function archiveIfNewWeek(checked: string[]): void {
  const store = read();
  const week = currentWeekStart();
  const active = store.active;
  if (!active || active.weekStart === week) return;
  const archive = [
    {
      weekStart: active.weekStart,
      mealIds: active.mealIds,
      checked,
      archivedAt: new Date().toISOString(),
    },
    ...(store.archive ?? []),
  ].slice(0, 8);
  write({ archive, active: empty(week) });
}

export function readWeekMenu(): WeekMenu {
  const store = read();
  const week = currentWeekStart();
  const active = store.active;
  if (!active || active.weekStart !== week) return empty(week);
  return { ...empty(week), ...active, weekStart: week };
}

export function writeWeekMenu(next: WeekMenu): WeekMenu {
  const store = read();
  write({ ...store, active: next });
  return next;
}

export function readArchive(): ArchivedWeek[] {
  return read().archive ?? [];
}
