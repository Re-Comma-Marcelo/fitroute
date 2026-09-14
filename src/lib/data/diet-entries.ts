/**
 * Single access point for meal entries — the ONE model of what a day has.
 *
 * Local-first: every read and write lands in localStorage immediately, and the
 * `meal_entries` table is synced in the background. The first read of a date
 * imports whatever the retired per-slot plan (`meal_plan`) and the old eaten
 * diary held for it, so nothing the user planned before is lost.
 */

import {
  deleteMealEntry,
  fetchMealEntries,
  fetchMealEntriesRange,
  persistMealEntry,
} from "../forja.functions";
import {
  isMigrated,
  localEntries,
  markMigrated,
  newEntryId,
  removeLocalEntry,
  upsertLocalEntries,
  upsertLocalEntry,
  type DietEntry,
} from "../diet-day";
import { allMeals, eatenFor, getMealSchedule, getWeekPlan, hourOf, MEAL_SLOTS } from "./nutrition";
import type { DayTotals, MealSchedule, MealSlot, WeekPlan } from "../nutrition-types";

export type { DietEntry };

function sortKey(e: DietEntry, slotTime: Record<MealSlot, string>): number {
  const time = e.time ?? slotTime[e.slot];
  return hourOf(time);
}

/**
 * One-time import of a date from the retired per-slot plan. Meals that are no
 * longer in the catalogue are skipped: a row pointing at a meal that does not
 * exist would render as nothing at all.
 */
function importLegacyDate(date: string, plan: WeekPlan, schedule: MealSchedule): void {
  if (isMigrated(date)) return;
  const day = plan[date] ?? {};
  const eaten = eatenFor(date);
  const known = new Set(allMeals().map((m) => m.id));
  const imported: DietEntry[] = [];
  for (const slot of MEAL_SLOTS) {
    const mealId = day[slot];
    if (!mealId || !known.has(mealId)) continue;
    imported.push({
      id: `legacy_${date}_${slot}`,
      date,
      slot,
      mealId,
      time: schedule[slot].time,
      planned: true,
      eaten: eaten[slot] === mealId,
      createdAt: new Date().toISOString(),
    });
  }
  if (imported.length) upsertLocalEntries(date, imported);
  markMigrated(date);
}

function ordered(date: string, schedule: MealSchedule): DietEntry[] {
  const slotTime = Object.fromEntries(MEAL_SLOTS.map((s) => [s, schedule[s].time])) as Record<
    MealSlot,
    string
  >;
  return [...localEntries(date)].sort(
    (a, b) => sortKey(a, slotTime) - sortKey(b, slotTime) || a.createdAt.localeCompare(b.createdAt),
  );
}

/** Entries for a date, ordered by their time of day. */
export async function getDayEntries(date: string): Promise<DietEntry[]> {
  const [plan, schedule] = await Promise.all([getWeekPlan(), getMealSchedule()]);
  importLegacyDate(date, plan, schedule);

  // Remote rows win on id collisions.
  try {
    const remote = (await fetchMealEntries({ data: { date } })) as DietEntry[];
    if (remote.length) upsertLocalEntries(date, remote);
  } catch {
    // Table missing or offline — local state is the source of truth.
  }

  return ordered(date, schedule);
}

/** Entries across several dates in one round trip (week views, totals). */
export async function getEntriesForDates(dates: string[]): Promise<DietEntry[]> {
  if (!dates.length) return [];
  const [plan, schedule] = await Promise.all([getWeekPlan(), getMealSchedule()]);
  for (const date of dates) importLegacyDate(date, plan, schedule);

  const sorted = [...dates].sort();
  try {
    const remote = (await fetchMealEntriesRange({
      data: { from: sorted[0] as string, to: sorted[sorted.length - 1] as string },
    })) as DietEntry[];
    const byDate = new Map<string, DietEntry[]>();
    for (const e of remote) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    for (const [date, list] of byDate) upsertLocalEntries(date, list);
  } catch {
    // Table missing or offline — local state is the source of truth.
  }

  return sorted.flatMap((date) => ordered(date, schedule));
}

const EMPTY_TOTALS: DayTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

/** Macros of a set of entries. Unknown meal ids contribute nothing. */
export function totalsForEntries(entries: DietEntry[]): DayTotals {
  const meals = allMeals();
  return entries.reduce<DayTotals>(
    (acc, e) => {
      const meal = meals.find((m) => m.id === e.mealId);
      if (!meal) return acc;
      return {
        kcal: acc.kcal + meal.kcal,
        proteinG: acc.proteinG + meal.proteinG,
        carbsG: acc.carbsG + meal.carbsG,
        fatG: acc.fatG + meal.fatG,
      };
    },
    { ...EMPTY_TOTALS },
  );
}

export interface DayNutrition {
  /** Macros of the meals marked as eaten. */
  eaten: DayTotals;
  /** Macros of everything on the day, eaten or still planned. */
  planned: DayTotals;
  entries: DietEntry[];
}

/** What a date actually holds — the number every screen should show. */
export async function getDayNutrition(date: string): Promise<DayNutrition> {
  const entries = await getDayEntries(date);
  return {
    eaten: totalsForEntries(entries.filter((e) => e.eaten)),
    planned: totalsForEntries(entries),
    entries,
  };
}

function sync(entry: DietEntry): void {
  void persistMealEntry({ data: { ...entry, time: entry.time } }).catch(() => {});
}

/** Adds a meal to a day. Never blocks a moment that already has meals. */
export async function addEntry(input: {
  date: string;
  slot: MealSlot;
  mealId: string;
  time?: string | undefined;
  planned?: boolean;
  eaten?: boolean;
}): Promise<DietEntry> {
  const entry: DietEntry = {
    id: newEntryId(),
    date: input.date,
    slot: input.slot,
    mealId: input.mealId,
    ...(input.time ? { time: input.time } : {}),
    planned: input.planned ?? true,
    eaten: input.eaten ?? false,
    createdAt: new Date().toISOString(),
  };
  upsertLocalEntry(entry);
  sync(entry);
  return entry;
}

export async function setEntryEaten(entry: DietEntry, eaten: boolean): Promise<DietEntry> {
  const next: DietEntry = { ...entry, eaten };
  upsertLocalEntry(next);
  sync(next);
  return next;
}

export async function setEntryTime(entry: DietEntry, time: string): Promise<DietEntry> {
  const next: DietEntry = { ...entry, time };
  upsertLocalEntry(next);
  sync(next);
  return next;
}

export async function removeEntry(entry: DietEntry): Promise<void> {
  removeLocalEntry(entry.date, entry.id);
  void deleteMealEntry({ data: { id: entry.id } }).catch(() => {});
}
