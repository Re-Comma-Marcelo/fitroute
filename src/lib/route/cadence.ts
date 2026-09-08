/**
 * Deterministic checkpoint spacing. The coach decides what a checkpoint
 * measures; this rule decides when it lands.
 */

const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date | string, to: Date | string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / DAY);
}

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Checkpoint dates between today and the goal date.
 * Roughly monthly for goals 2+ months out, 1–2 weeks for shorter goals.
 */
export function checkpointDates(goalDate: string, from = new Date()): string[] {
  const total = daysBetween(from, goalDate);
  if (total < 10) return [];
  const step = total >= 60 ? 30 : total >= 35 ? 14 : 7;
  const dates: string[] = [];
  for (let day = step; day <= total - Math.floor(step / 3); day += step) {
    dates.push(isoDay(addDays(from, day)));
  }
  // The goal date itself always closes the route.
  const goal = isoDay(new Date(goalDate));
  if (!dates.includes(goal)) dates.push(goal);
  return dates.slice(0, 12);
}

/** How many checkpoints a goal of this length should get. */
export function plannedCount(goalDate: string, from = new Date()): number {
  return checkpointDates(goalDate, from).length;
}
