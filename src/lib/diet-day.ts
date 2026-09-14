/**
 * Local-first diary of meal entries for a day.
 *
 * The old model allowed exactly one meal per slot (meal_plan is keyed on
 * user + date + slot). Real eating is not that tidy: two snacks, two lunches,
 * a meal logged that was never planned. An entry list per date models that,
 * keeps working without a Supabase migration, and syncs once the optional
 * `meal_entries` table exists (scripts/supabase-migration-meal-entries.sql).
 */

import type { MealSlot } from "./nutrition-types";

export interface DietEntry {
  id: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** Eating moment — a label, not a unique slot. */
  slot: MealSlot;
  mealId: string;
  /** Optional "HH:MM" so several entries of the same type sort logically. */
  time?: string;
  /**
   * How much of the meal this entry is: 1 = one serving, 0.5 = half of it.
   * Absent means one serving (entries written before portions existed).
   */
  portion?: number;
  /** True when the user planned it ahead; false when it was logged as eaten only. */
  planned: boolean;
  eaten: boolean;
  createdAt: string;
}

type Store = Record<string, DietEntry[]>;

const KEY = "forja.dietEntries.v1";
const MIGRATED_KEY = "forja.dietEntriesMigrated.v1";

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(store));
}

export function newEntryId(): string {
  return `de_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function localEntries(date: string): DietEntry[] {
  return read()[date] ?? [];
}

export function upsertLocalEntry(entry: DietEntry): DietEntry[] {
  const store = read();
  const day = (store[entry.date] ?? []).filter((e) => e.id !== entry.id);
  const next = [...day, entry];
  store[entry.date] = next;
  write(store);
  return next;
}

export function upsertLocalEntries(date: string, entries: DietEntry[]): DietEntry[] {
  const store = read();
  const byId = new Map((store[date] ?? []).map((e) => [e.id, e]));
  for (const e of entries) byId.set(e.id, e);
  store[date] = [...byId.values()];
  write(store);
  return store[date];
}

export function removeLocalEntry(date: string, id: string): DietEntry[] {
  const store = read();
  store[date] = (store[date] ?? []).filter((e) => e.id !== id);
  if (!store[date].length) delete store[date];
  write(store);
  return store[date] ?? [];
}

// ---- one-time import of the old per-slot plan ------------------------------

function migratedDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MIGRATED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function isMigrated(date: string): boolean {
  return migratedDates().includes(date);
}

export function markMigrated(date: string): void {
  if (typeof window === "undefined") return;
  const next = [...new Set([...migratedDates(), date])].slice(-120);
  window.localStorage.setItem(MIGRATED_KEY, JSON.stringify(next));
}
