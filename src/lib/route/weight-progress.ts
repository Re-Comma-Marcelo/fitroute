/**
 * Weekly body-weight read-outs for the route: not a target, just a
 * confirmation of what actually happened, since a single day's weigh-in
 * fluctuates too much (water, sodium, timing) to mean much on its own.
 */
import type { BodyWeightEntry } from "@/lib/types";
import { addDays, isoDay, daysBetween } from "./cadence";

export interface WeekMarker {
  /** ISO date the week starts on. */
  weekStartIso: string;
  /** ISO date the week ends on (exclusive) — used to know when it has fully elapsed. */
  weekEndIso: string;
  /** Average of that week's weigh-ins, or null when nothing was logged yet that week. */
  avgKg: number | null;
}

/** Average of the entries that fall within [weekStartIso, weekStartIso + 7 days). */
export function weeklyAverage(entries: BodyWeightEntry[], weekStartIso: string): number | null {
  const start = new Date(weekStartIso);
  const end = addDays(start, 7);
  const inWeek = entries.filter((e) => {
    const d = new Date(e.data);
    return d >= start && d < end;
  });
  if (!inWeek.length) return null;
  const sum = inWeek.reduce((total, e) => total + e.pesoKg, 0);
  return Math.round((sum / inWeek.length) * 10) / 10;
}

/**
 * One marker per 7-day step from `fromIso` up to (not including) `toIso` —
 * the weeks between one route point and the next.
 */
export function weekMarkers(
  fromIso: string,
  toIso: string,
  entries: BodyWeightEntry[],
): WeekMarker[] {
  const total = daysBetween(fromIso, toIso);
  const out: WeekMarker[] = [];
  for (let day = 0; day < total; day += 7) {
    const weekStart = addDays(new Date(fromIso), day);
    const weekStartIso = isoDay(weekStart);
    out.push({
      weekStartIso,
      weekEndIso: isoDay(addDays(weekStart, 7)),
      avgKg: weeklyAverage(entries, weekStartIso),
    });
  }
  return out;
}
