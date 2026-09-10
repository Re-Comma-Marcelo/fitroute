/**
 * Single access point for the day's meal entries.
 *
 * Local-first: every read and write lands in localStorage immediately, and the
 * optional `meal_entries` table is synced in the background when it exists.
 * The first read of a date imports whatever the old per-slot plan and the
 * eaten diary held for it, so nothing the user planned before is lost.
 */

import { deleteMealEntry, fetchMealEntries, persistMealEntry } from "../forja.functions";
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
import { eatenFor, getMealSchedule, getWeekPlan, hourOf, MEAL_SLOTS } from "./nutrition";
import type { MealSlot } from "../nutrition-types";

export type { DietEntry };

function sortKey(e: DietEntry, slotTime: Record<MealSlot, string>): number {
  const time = e.time ?? slotTime[e.slot];
  return hourOf(time);
}

/** Entries for a date, ordered by their time of day. */
export async function getDayEntries(date: string): Promise<DietEntry[]> {
  const [plan, schedule] = await Promise.all([getWeekPlan(), getMealSchedule()]);

  if (!isMigrated(date)) {
    const day = plan[date] ?? {};
    const eaten = eatenFor(date);
    const imported: DietEntry[] = [];
    for (const slot of MEAL_SLOTS) {
      const mealId = day[slot];
      if (!mealId) continue;
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

  // Remote rows win on id collisions when the table has been migrated.
  try {
    const remote = (await fetchMealEntries({ data: { date } })) as DietEntry[];
    if (remote.length) upsertLocalEntries(date, remote);
  } catch {
    // Table missing or offline — local state is the source of truth.
  }

  const slotTime = Object.fromEntries(MEAL_SLOTS.map((s) => [s, schedule[s].time])) as Record<
    MealSlot,
    string
  >;
  return [...localEntries(date)].sort(
    (a, b) => sortKey(a, slotTime) - sortKey(b, slotTime) || a.createdAt.localeCompare(b.createdAt),
  );
}

function sync(entry: DietEntry): void {
  void persistMealEntry({ data: { ...entry, time: entry.time } }).catch(() => {});
}

/** Adds a meal to a day. Never blocks on a slot that is already filled. */
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
