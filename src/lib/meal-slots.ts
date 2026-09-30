import type { Meal, MealSchedule, MealSlot } from "./nutrition-types";

/**
 * Every eating moment the app knows, in day order. The four classic ones are
 * on by default; the rest start switched off and are added from the meal
 * timing sheet by whoever actually eats them (a supper shake, a pre-workout
 * snack…). Plain data with no client/server deps, so the MCP tools can share it.
 */
export const MEAL_SLOTS: MealSlot[] = [
  "breakfast",
  "morning_snack",
  "lunch",
  "snack",
  "pre_workout",
  "post_workout",
  "dinner",
  "supper",
];

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  morning_snack: "Morning snack",
  lunch: "Lunch",
  snack: "Afternoon snack",
  pre_workout: "Pre-workout",
  post_workout: "Post-workout",
  dinner: "Dinner",
  supper: "Supper",
};

/**
 * The classic moment whose library meals also fit an optional one — the
 * built-in catalogue only tags meals with the four classic slots, and a supper
 * is picked from the same light food as a snack.
 */
export const SLOT_BASE: Record<MealSlot, MealSlot> = {
  breakfast: "breakfast",
  morning_snack: "snack",
  lunch: "lunch",
  snack: "snack",
  pre_workout: "snack",
  post_workout: "snack",
  dinner: "dinner",
  supper: "snack",
};

export const DEFAULT_SCHEDULE: MealSchedule = {
  breakfast: { time: "08:00", enabled: true },
  morning_snack: { time: "10:00", enabled: false },
  lunch: { time: "12:30", enabled: true },
  snack: { time: "16:00", enabled: true },
  pre_workout: { time: "17:30", enabled: false },
  post_workout: { time: "19:00", enabled: false },
  dinner: { time: "20:00", enabled: true },
  supper: { time: "22:00", enabled: false },
};

export function isMealSlot(value: string): value is MealSlot {
  return (MEAL_SLOTS as string[]).includes(value);
}

/** A meal fits a moment it was tagged with, or the classic moment behind it. */
export function mealFitsSlot(meal: Pick<Meal, "slots">, slot: MealSlot): boolean {
  return meal.slots.includes(slot) || meal.slots.includes(SLOT_BASE[slot]);
}
