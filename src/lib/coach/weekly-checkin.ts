/**
 * Weekly check-in. At the start of a training week (Sunday, or Monday when the
 * app was not opened on Sunday) the coach asks how last week went, what the
 * week looks like, which days are trainable, how the body feels and what the
 * user weighs. The answers set the weekly goal, spread the routines over the
 * chosen days and feed the coach notes.
 */
import { isoDate } from "@/lib/data/nutrition";
import { fetchWeeklyCheckIns, persistWeeklyCheckIn } from "@/lib/forja.functions";
import type { Routine } from "@/lib/types";

export type WeekFeeling = "strong" | "ok" | "heavy";

export interface WeeklyCheckIn {
  /** ISO date (Monday) of the week this check-in plans. */
  weekKey: string;
  completedAt: string;
  feeling: WeekFeeling;
  /** Free text about school/work/social plans for the week. */
  lifeNote: string;
  /** JS day numbers (0 = Sunday) the user can train. */
  days: number[];
  issues: string[];
  issueNote: string;
  weightKg: number | null;
}

const KEY = "ironlogger.weeklyCheckin.v1";

/** Monday of the week the user should be planning right now. */
export function planWeekStart(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // Sunday plans the week that starts tomorrow; any other day plans this week.
  d.setDate(d.getDate() + (day === 0 ? 1 : 1 - day));
  return d;
}

export function planWeekKey(now = new Date()): string {
  return isoDate(planWeekStart(now));
}

export function getCheckIns(): WeeklyCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WeeklyCheckIn[]) : [];
  } catch {
    return [];
  }
}

export function latestCheckIn(): WeeklyCheckIn | null {
  return [...getCheckIns()].sort((a, b) => b.weekKey.localeCompare(a.weekKey))[0] ?? null;
}

export function checkInFor(weekKey: string): WeeklyCheckIn | null {
  return getCheckIns().find((c) => c.weekKey === weekKey) ?? null;
}

export function saveCheckIn(entry: WeeklyCheckIn) {
  if (typeof window === "undefined") return;
  const list = getCheckIns().filter((c) => c.weekKey !== entry.weekKey);
  try {
    window.localStorage.setItem(KEY, JSON.stringify([entry, ...list].slice(0, 12)));
  } catch {
    /* storage unavailable */
  }
  // Local save above is immediate; this is a best-effort background sync so
  // the check-in survives a fresh device/browser instead of living only here.
  void persistWeeklyCheckIn({
    data: {
      weekKey: entry.weekKey,
      feeling: entry.feeling,
      lifeNote: entry.lifeNote,
      days: entry.days,
      issues: entry.issues,
      weightKg: entry.weightKg,
    },
  }).catch(() => {});
}

/**
 * Pulls check-ins saved from another device/browser into local storage, so
 * `checkInDue`/`checkInFor` (both local-only reads) see the full picture.
 * Remote rows win on a weekKey collision.
 */
export async function hydrateCheckIns(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const remote = await fetchWeeklyCheckIns();
    if (!remote.length) return;
    const local = getCheckIns();
    const remoteKeys = new Set(remote.map((r) => r.weekKey));
    const merged = [...remote, ...local.filter((c) => !remoteKeys.has(c.weekKey))];
    window.localStorage.setItem(KEY, JSON.stringify(merged.slice(0, 12)));
  } catch {
    // Table missing or offline — local state is the source of truth.
  }
}

/**
 * Due on Sunday and Monday while the upcoming week has no check-in yet. If the
 * user skips both days the card stays out of the way until the next weekend.
 */
export function checkInDue(now = new Date()): boolean {
  const day = now.getDay();
  if (day !== 0 && day !== 1) return false;
  return !checkInFor(planWeekKey(now));
}

/** Spread the chosen days over the routines, in order, round-robin. */
export function assignDays(routines: Routine[], days: number[]): Routine[] {
  if (!routines.length || !days.length) return [];
  const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
  const buckets = routines.map<number[]>(() => []);
  sorted.forEach((day, i) => {
    buckets[i % routines.length]?.push(day);
  });
  return routines.map((r, i) => ({ ...r, diasSemana: buckets[i] ?? [] }));
}

export const ISSUE_KEYS = ["shoulder", "back", "knee", "tired", "nothing"] as const;
export type IssueKey = (typeof ISSUE_KEYS)[number];

/** One grounded coach line built from the answers, never a generic pep talk. */
export function coachLine(entry: WeeklyCheckIn): string {
  const real = entry.issues.filter((i) => i !== "nothing");
  if (real.includes("shoulder")) {
    return "Shoulder flagged — start upper-body sessions lighter and skip overhead pressing if it pinches.";
  }
  if (real.includes("back")) {
    return "Back flagged — keep deadlifts and rows submaximal this week and brace before every set.";
  }
  if (real.includes("knee")) {
    return "Knee flagged — squat to a depth that stays pain-free and add reps instead of load.";
  }
  if (real.includes("tired") || entry.feeling === "heavy") {
    return "Heavy week behind you — hold the loads and cut one set per exercise until energy is back.";
  }
  if (entry.days.length <= 2) {
    return "Few slots this week — train full body on those days so nothing gets skipped.";
  }
  if (entry.feeling === "strong") {
    return "You felt strong — add a small load bump on your first working set of each lift.";
  }
  return "Plan is set — same loads as last time, and log every set so I can adjust.";
}
