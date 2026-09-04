import { tx } from "@/lib/format";
import type { CoachNote, Profile, Workout } from "@/lib/types";
import { currentWeekStart, daysSince } from "./signals";

export interface RestDayVerdict {
  /** True when the coach thinks today should be a rest day. */
  rest: boolean;
  /** Short headline, e.g. "Rest day". */
  title: string;
  /** One-liner explaining the call. */
  line: string;
  /** Supporting reasons. */
  why: string[];
}

/** Sessions logged today (started today and finished). */
function trainedToday(workouts: Workout[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return workouts.some((w) => new Date(w.iniciadoEm).getTime() >= today.getTime());
}

/** Days remaining in the current week, counting today (Mon-based week). */
function daysLeftInWeek(): number {
  const day = (new Date().getDay() + 6) % 7; // 0 = Monday
  return 7 - day;
}

/**
 * Decides whether today is a rest day, purely from local history + profile.
 * The user picked N sessions a week, so the coach only pushes a session when
 * the remaining days in the week are actually needed.
 */
export function restDayVerdict(
  workouts: Workout[],
  profile: Profile,
  notes: CoachNote[] = [],
): RestDayVerdict {
  const goal = Math.max(1, profile.metaTreinosSemana);
  const weekStart = currentWeekStart();
  const done = workouts.filter(
    (w) => new Date(w.iniciadoEm).toISOString() >= weekStart && w.finalizadoEm,
  ).length;
  const remaining = goal - done;
  const left = daysLeftInWeek();
  const sorted = [...workouts]
    .filter((w) => w.finalizadoEm)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm));
  const last = sorted[0];
  const sinceLast = last ? daysSince(last.iniciadoEm) : 99;
  const soreness = notes.some(
    (n) =>
      n.createdAt > new Date(Date.now() - 2 * 86400000).toISOString() &&
      (n.tags.includes("soreness") || n.tags.includes("injury")),
  );

  const no = (): RestDayVerdict => ({ rest: false, title: "", line: "", why: [] });

  if (trainedToday(workouts)) {
    return {
      rest: true,
      title: tx("Rest of the day"),
      line: tx("You already trained today — the rest of the day is recovery."),
      why: [
        tx("{done} of {goal} sessions logged this week.", { done, goal }),
        tx("Eat enough protein and sleep well; that's where the session pays off."),
      ],
    };
  }

  if (remaining <= 0) {
    return {
      rest: true,
      title: tx("Rest day"),
      line: tx("You've hit your {goal} sessions this week — today is a rest day.", { goal }),
      why: [
        tx("Extra sessions on top of your target mostly add fatigue, not progress."),
        tx("Train again on the first day of next week, or add one only if you feel fresh."),
      ],
    };
  }

  // Enough slack left in the week and you trained yesterday: space it out.
  if (remaining < left && sinceLast <= 1) {
    return {
      rest: true,
      title: tx("Rest day"),
      line: tx("You trained yesterday and still have {left} days for {remaining} sessions.", {
        left,
        remaining,
      }),
      why: [
        tx("Spacing sessions out keeps each one hard enough to drive progress."),
        soreness
          ? tx("You flagged soreness recently, so an extra day helps.")
          : tx("Light walking or mobility today is plenty."),
      ],
    };
  }

  if (soreness && sinceLast <= 1 && remaining < left) {
    return {
      rest: true,
      title: tx("Rest day"),
      line: tx("You flagged soreness and trained yesterday — take today off."),
      why: [tx("{remaining} sessions still fit in the {left} days left.", { remaining, left })],
    };
  }

  return no();
}
