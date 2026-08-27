import { DAY_KEYS, SLOT_PARTS, type PlanIntake, type PlannedSlot, type SlotGrid, type SlotState, type TimeBudget } from "./types";
import { sportLoadUnits, sportMinutesPerWeek } from "./sports";

/** Minutes a slot state is worth before any adjustment. */
const SLOT_MINUTES: Record<SlotState, number> = { free: 75, tight: 35, blocked: 0 };

const ADJUST_FACTOR = { less: 0.7, asIs: 1, more: 1.25 } as const;

export function emptyGrid(): SlotGrid {
  const grid = {} as SlotGrid;
  for (const day of DAY_KEYS) {
    grid[day] = { morning: "blocked", midday: "blocked", evening: "blocked" };
  }
  return grid;
}

export function countStates(grid: SlotGrid): Record<SlotState, number> {
  const counts: Record<SlotState, number> = { free: 0, tight: 0, blocked: 0 };
  for (const day of DAY_KEYS) for (const part of SLOT_PARTS) counts[grid[day][part]] += 1;
  return counts;
}

/**
 * The whole point of the life step: the user never types minutes. We read their
 * week (free/tight slots, sports, sleep, stress, commute) and work the training
 * time out ourselves, then play it back for confirmation.
 */
export function deriveTimeBudget(intake: PlanIntake): TimeBudget {
  const sportDays = new Set(intake.sports.flatMap((s) => s.days));
  const raw: PlannedSlot[] = [];

  for (const day of DAY_KEYS) {
    for (const part of SLOT_PARTS) {
      const state = intake.slots[day][part];
      if (state === "blocked") continue;
      let minutes = SLOT_MINUTES[state];
      // A day that already holds a sport session leaves less room for the gym.
      if (sportDays.has(day)) minutes *= 0.6;
      // Commuting eats into every usable slot.
      if (intake.commuteMin >= 60) minutes -= 15;
      else if (intake.commuteMin >= 30) minutes -= 8;
      if (intake.careDuties) minutes -= 10;
      if (intake.workPattern === "shifts" || intake.workPattern === "nights") minutes -= 5;
      minutes = Math.round(Math.max(0, minutes) * ADJUST_FACTOR[intake.timeAdjust]);
      if (minutes >= 25) raw.push({ day, part, minutes });
    }
  }

  raw.sort((a, b) => b.minutes - a.minutes);

  const counts = countStates(intake.slots);
  const sportMinutes = sportMinutesPerWeek(intake.sports);
  const loadUnits = sportLoadUnits(intake.sports);

  // Recovery: short sleep, high stress or a heavy sport week means fewer / shorter gym days.
  let recoveryFactor = 1;
  if (intake.sleepHours < 6) recoveryFactor -= 0.15;
  else if (intake.sleepHours < 7) recoveryFactor -= 0.07;
  if (intake.stress >= 4) recoveryFactor -= 0.1;
  if (loadUnits > 400) recoveryFactor -= 0.12;
  if (intake.dailyActivity === "physical") recoveryFactor -= 0.05;
  recoveryFactor = Math.max(0.65, Math.round(recoveryFactor * 100) / 100);

  const maxGymDays = Math.max(
    1,
    Math.min(
      intake.gymDaysPerWeek || 3,
      Math.round((intake.gymDaysPerWeek || 3) * recoveryFactor + 0.35),
      raw.length,
    ),
  );

  const gymSlots = raw.slice(0, maxGymDays).map((slot) => ({
    ...slot,
    minutes: Math.max(30, Math.min(90, Math.round((slot.minutes * recoveryFactor) / 5) * 5)),
  }));

  const gymMinutesPerWeek = gymSlots.reduce((sum, s) => sum + s.minutes, 0);

  return {
    gymMinutesPerWeek,
    sportMinutesPerWeek: sportMinutes,
    gymSlots,
    freeSlotCount: counts.free,
    tightSlotCount: counts.tight,
    recoveryFactor,
    tight: gymMinutesPerWeek < 120 || gymSlots.length < 2,
  };
}

export function hoursLabel(minutes: number): string {
  const rounded = Math.round(minutes / 15) * 15;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Weekly minutes on food prep-heavy plans; used to pick meal complexity. */
export function maxPrepMinutes(intake: PlanIntake): number {
  if (intake.cookTime === "none") return 12;
  if (intake.cookTime === "some") return 25;
  return 60;
}
