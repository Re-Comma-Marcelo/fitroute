import { formatTimeOfDay } from "../format";
import {
  deleteCustomMeal,
  fetchCustomMeals,
  fetchNutritionState,
  persistCheckedItem,
  persistCustomMeal,
  persistMealSchedule,
  persistPlannedMeals,
} from "../forja.functions";
import { meals } from "./meals.mock";
import { getProfile } from "./profile";
import { getWorkouts } from "./workouts";
import type {
  DayTotals,
  Meal,
  MealSchedule,
  MealSlot,
  NutritionTargets,
  ShoppingItem,
  TrainingTag,
  WeekPlan,
} from "../nutrition-types";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

export const DEFAULT_SCHEDULE: MealSchedule = {
  breakfast: { time: "08:00", enabled: true },
  lunch: { time: "12:30", enabled: true },
  snack: { time: "16:00", enabled: true },
  dinner: { time: "20:00", enabled: true },
};

// ---- state (hydrated from Supabase, cached in memory) ----------------------

let scheduleCache: MealSchedule = structuredClone(DEFAULT_SCHEDULE);
let planCache: WeekPlan = {};
let checkedCache: string[] = [];
let customCache: Meal[] = [];
let hydrated = false;
let hydrating: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (!hydrating) {
    hydrating = Promise.all([
      fetchNutritionState(),
      fetchCustomMeals().catch(() => [] as unknown[]),
    ]).then(([state, custom]) => {
      customCache = (custom as unknown[]).map((m) => ({ ...(m as Meal), custom: true }));
      planCache = (state.plan ?? {}) as WeekPlan;
      checkedCache = state.checked ?? [];
      const raw = (state.schedule ?? {}) as Partial<
        Record<MealSlot, { time: string; enabled: boolean }>
      >;
      scheduleCache = {
        breakfast: { ...DEFAULT_SCHEDULE.breakfast, ...raw.breakfast },
        lunch: { ...DEFAULT_SCHEDULE.lunch, ...raw.lunch },
        snack: { ...DEFAULT_SCHEDULE.snack, ...raw.snack },
        dinner: { ...DEFAULT_SCHEDULE.dinner, ...raw.dinner },
      };
      hydrated = true;
      hydrating = null;
    });
  }
  return hydrating;
}

/** Meal timing template — synchronous read of the hydrated cache. */
export function mealSchedule(): MealSchedule {
  return scheduleCache;
}

export async function getMealSchedule(): Promise<MealSchedule> {
  await hydrate();
  return structuredClone(scheduleCache);
}

export async function saveMealSchedule(next: MealSchedule): Promise<MealSchedule> {
  scheduleCache = structuredClone(next);
  await persistMealSchedule({ data: { schedule: scheduleCache } });
  return structuredClone(scheduleCache);
}

export function hourOf(time: string): number {
  const [h, m] = time.split(":");
  return Number(h ?? 0) + Number(m ?? 0) / 60;
}

/** Formats "08:00" using the user's locale (e.g. 8:00 AM). */
export function formatSlotTime(time: string): string {
  return formatTimeOfDay(time);
}

/** Slots the user actually eats, ordered by their scheduled time. */
export function activeSlots(schedule: MealSchedule = mealSchedule()): MealSlot[] {
  return MEAL_SLOTS.filter((s) => schedule[s].enabled).sort(
    (a, b) => hourOf(schedule[a].time) - hourOf(schedule[b].time),
  );
}

export function slotForTime(date = new Date(), schedule: MealSchedule = mealSchedule()): MealSlot {
  const h = date.getHours() + date.getMinutes() / 60;
  const slots = activeSlots(schedule);
  let best: MealSlot = slots[0] ?? "breakfast";
  let bestDiff = Infinity;
  for (const s of slots) {
    const d = Math.abs(hourOf(schedule[s].time) - h);
    if (d < bestDiff) {
      bestDiff = d;
      best = s;
    }
  }
  return best;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday-based week containing `ref`. */
export function weekDates(ref = new Date()): string[] {
  const base = new Date(ref);
  const dow = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return isoDate(d);
  });
}

/** Mock library plus the user's own meals (custom first). */
export function allMeals(): Meal[] {
  return [...customCache, ...meals];
}

export async function getMeals(slot?: MealSlot): Promise<Meal[]> {
  await hydrate();
  const list = slot ? allMeals().filter((m) => m.slots.includes(slot)) : allMeals();
  return list.map((m) => ({ ...m }));
}

export async function getMeal(id: string): Promise<Meal | undefined> {
  await hydrate();
  return allMeals().find((m) => m.id === id);
}

/** Saves an AI-estimated meal to the user's library. */
export async function createCustomMeal(
  meal: Omit<Meal, "id">,
  source: "text" | "photo",
): Promise<Meal> {
  await hydrate();
  const saved = (await persistCustomMeal({
    data: { meal: meal as unknown as Record<string, unknown>, source },
  })) as unknown as Meal;
  const normalized: Meal = { ...saved, custom: true, source };
  customCache = [normalized, ...customCache.filter((m) => m.id !== normalized.id)];
  return normalized;
}

export async function removeCustomMeal(id: string): Promise<void> {
  await hydrate();
  await deleteCustomMeal({ data: { id } });
  customCache = customCache.filter((m) => m.id !== id);
}

export async function getWeekPlan(): Promise<WeekPlan> {
  await hydrate();
  return structuredClone(planCache);
}

export async function setPlannedMeal(
  date: string,
  slot: MealSlot,
  mealId: string | null,
): Promise<WeekPlan> {
  await hydrate();
  const day = { ...(planCache[date] ?? {}) };
  if (mealId) day[slot] = mealId;
  else delete day[slot];
  planCache = { ...planCache, [date]: day };
  await persistPlannedMeals({
    data: {
      set: mealId ? [{ date, slot, mealId }] : [],
      clear: mealId ? [] : [{ date, slot }],
    },
  });
  return structuredClone(planCache);
}

/** Auto-fills every empty slot of the week with a target-aware suggestion. */
export async function autoFillWeek(ref = new Date()): Promise<WeekPlan> {
  await hydrate();
  const dates = weekDates(ref);
  const tags = await getTrainingTags(dates);
  const set: { date: string; slot: string; mealId: string }[] = [];
  const next: WeekPlan = { ...planCache };
  dates.forEach((date, di) => {
    const day = { ...(next[date] ?? {}) };
    activeSlots().forEach((slot, si) => {
      if (day[slot]) return;
      const options = pickForTag(
        allMeals().filter((m) => m.slots.includes(slot) && !m.orderOut),
        tags[date],
      );
      const chosen = options[(di * 3 + si) % Math.max(1, options.length)];
      if (chosen) {
        day[slot] = chosen.id;
        set.push({ date, slot, mealId: chosen.id });
      }
    });
    next[date] = day;
  });
  planCache = next;
  if (set.length) await persistPlannedMeals({ data: { set, clear: [] } });
  return structuredClone(planCache);
}

export async function clearWeek(ref = new Date()): Promise<WeekPlan> {
  await hydrate();
  const dates = weekDates(ref);
  const next = { ...planCache };
  for (const d of dates) delete next[d];
  planCache = next;
  await persistPlannedMeals({ data: { set: [], clear: dates.map((date) => ({ date })) } });
  return structuredClone(planCache);
}

function pickForTag(list: Meal[], tag: TrainingTag | undefined): Meal[] {
  if (tag === "Cardio") {
    const hc = list.filter((m) => m.tags.includes("high-carb"));
    return hc.length ? hc : list;
  }
  if (tag === "Strength") {
    const hp = list.filter((m) => m.tags.includes("high-protein"));
    return hp.length ? hp : list;
  }
  const light = list.filter((m) => m.tags.includes("light"));
  return light.length ? light : list;
}

export async function getTargets(): Promise<NutritionTargets> {
  const p = await getProfile();
  const bmr = 10 * p.pesoKg + 6.25 * p.alturaCm - 5 * 30 + (p.sexo === "feminino" ? -161 : 5);
  const mult: Record<string, number> = {
    sedentario: 1.25,
    leve: 1.4,
    moderado: 1.55,
    intenso: 1.7,
    atleta: 1.85,
  };
  let kcal = bmr * (mult[p.nivelAtividade] ?? 1.55);
  if (p.objetivo === "cutting") kcal *= 0.85;
  if (p.objetivo === "bulking") kcal *= 1.12;
  kcal = Math.round(kcal / 10) * 10;
  const proteinG = Math.round(p.pesoKg * 2);
  const fatG = Math.round((kcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  return { kcal, proteinG, carbsG, fatG };
}

export function totalsFor(day: Partial<Record<MealSlot, string>> | undefined): DayTotals {
  const t: DayTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  if (!day) return t;
  for (const slot of MEAL_SLOTS) {
    const meal = allMeals().find((m) => m.id === day[slot]);
    if (!meal) continue;
    t.kcal += meal.kcal;
    t.proteinG += meal.proteinG;
    t.carbsG += meal.carbsG;
    t.fatG += meal.fatG;
  }
  return t;
}

/** Training tag per date, derived from logged workouts (Strength / Rest). */
export async function getTrainingTags(dates: string[]): Promise<Record<string, TrainingTag>> {
  const workouts = await getWorkouts();
  const trained = new Set(workouts.map((w) => isoDate(new Date(w.iniciadoEm))));
  const out: Record<string, TrainingTag> = {};
  for (const d of dates) out[d] = trained.has(d) ? "Strength" : "Rest";
  return out;
}

export async function getShoppingList(dates: string[]): Promise<{
  items: ShoppingItem[];
  orderOut: { date: string; slot: MealSlot; meal: Meal }[];
}> {
  await hydrate();
  const map = new Map<string, ShoppingItem>();
  const orderOut: { date: string; slot: MealSlot; meal: Meal }[] = [];
  for (const date of dates) {
    const day = planCache[date];
    if (!day) continue;
    for (const slot of MEAL_SLOTS) {
      const meal = allMeals().find((m) => m.id === day[slot]);
      if (!meal) continue;
      if (meal.orderOut) {
        orderOut.push({ date, slot, meal });
        continue;
      }
      for (const ing of meal.ingredients) {
        const key = `${ing.name}|${ing.unit}`;
        const prev = map.get(key);
        if (prev) prev.qty += ing.qty;
        else map.set(key, { key, name: ing.name, qty: ing.qty, unit: ing.unit, aisle: ing.aisle });
      }
    }
  }
  const items = [...map.values()].sort(
    (a, b) => a.aisle.localeCompare(b.aisle) || a.name.localeCompare(b.name),
  );
  return { items, orderOut };
}

export function getCheckedItems(): string[] {
  return [...checkedCache];
}

/**
 * Optimistic toggle. If persistence fails, the cache is rolled back and
 * `onError` runs so the UI can warn and re-render the real state.
 */
export function toggleCheckedItem(key: string, onError?: (revert: string[]) => void): string[] {
  const previous = [...checkedCache];
  const current = new Set(checkedCache);
  const checked = !current.has(key);
  if (checked) current.add(key);
  else current.delete(key);
  checkedCache = [...current];
  persistCheckedItem({ data: { key, checked } }).catch(() => {
    checkedCache = previous;
    onError?.([...previous]);
  });
  return [...checkedCache];
}

/** Summed totals across the given dates of the current plan. */
export function weekTotalsFor(p: WeekPlan, dates: string[]): DayTotals {
  return dates.reduce<DayTotals>(
    (acc, d) => {
      const t = totalsFor(p[d]);
      return {
        kcal: acc.kcal + t.kcal,
        proteinG: acc.proteinG + t.proteinG,
        carbsG: acc.carbsG + t.carbsG,
        fatG: acc.fatG + t.fatG,
      };
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
