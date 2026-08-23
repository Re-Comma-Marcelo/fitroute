import { delay } from "./mocks";
import { meals } from "./meals.mock";
import { getProfile } from "./profile";
import { getWorkouts } from "./workouts";
import type {
  DayTotals,
  Meal,
  MealSlot,
  NutritionTargets,
  ShoppingItem,
  TrainingTag,
  WeekPlan,
} from "../nutrition-types";

const PLAN_KEY = "forja.nutrition.plan.v1";
const CHECKED_KEY = "forja.nutrition.checked.v1";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snack: "Snack",
  dinner: "Dinner",
};

/** Center hour used to pick the slot closest to "now". */
const SLOT_HOUR: Record<MealSlot, number> = {
  breakfast: 8,
  lunch: 12.5,
  snack: 16,
  dinner: 20,
};

export function slotForTime(date = new Date()): MealSlot {
  const h = date.getHours() + date.getMinutes() / 60;
  let best: MealSlot = "breakfast";
  let bestDiff = Infinity;
  for (const s of MEAL_SLOTS) {
    const d = Math.abs(SLOT_HOUR[s] - h);
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

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

let planCache: WeekPlan | null = null;

function plan(): WeekPlan {
  if (!planCache) planCache = readJson<WeekPlan>(PLAN_KEY, {});
  return planCache;
}

export async function getMeals(slot?: MealSlot): Promise<Meal[]> {
  const list = slot ? meals.filter((m) => m.slots.includes(slot)) : meals;
  return delay(list.map((m) => ({ ...m })));
}

export async function getMeal(id: string): Promise<Meal | undefined> {
  return delay(meals.find((m) => m.id === id));
}

export async function getWeekPlan(): Promise<WeekPlan> {
  return delay(structuredClone(plan()));
}

export async function setPlannedMeal(
  date: string,
  slot: MealSlot,
  mealId: string | null,
): Promise<WeekPlan> {
  const p = plan();
  const day = { ...(p[date] ?? {}) };
  if (mealId) day[slot] = mealId;
  else delete day[slot];
  p[date] = day;
  planCache = { ...p };
  writeJson(PLAN_KEY, planCache);
  return delay(structuredClone(planCache), 60);
}

/** Auto-fills every empty slot of the week with a target-aware suggestion. */
export async function autoFillWeek(ref = new Date()): Promise<WeekPlan> {
  const dates = weekDates(ref);
  const tags = await getTrainingTags(dates);
  const p = plan();
  dates.forEach((date, di) => {
    const day = { ...(p[date] ?? {}) };
    MEAL_SLOTS.forEach((slot, si) => {
      if (day[slot]) return;
      const options = pickForTag(meals.filter((m) => m.slots.includes(slot) && !m.orderOut), tags[date]);
      const chosen = options[(di * 3 + si) % Math.max(1, options.length)];
      if (chosen) day[slot] = chosen.id;
    });
    p[date] = day;
  });
  planCache = { ...p };
  writeJson(PLAN_KEY, planCache);
  return delay(structuredClone(planCache), 120);
}

export async function clearWeek(ref = new Date()): Promise<WeekPlan> {
  const dates = weekDates(ref);
  const p = plan();
  for (const d of dates) delete p[d];
  planCache = { ...p };
  writeJson(PLAN_KEY, planCache);
  return delay(structuredClone(planCache), 60);
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
    const meal = meals.find((m) => m.id === day[slot]);
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
  const p = plan();
  const map = new Map<string, ShoppingItem>();
  const orderOut: { date: string; slot: MealSlot; meal: Meal }[] = [];
  for (const date of dates) {
    const day = p[date];
    if (!day) continue;
    for (const slot of MEAL_SLOTS) {
      const meal = meals.find((m) => m.id === day[slot]);
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
  return delay({ items, orderOut });
}

export function getCheckedItems(): string[] {
  return readJson<string[]>(CHECKED_KEY, []);
}

export function toggleCheckedItem(key: string): string[] {
  const current = new Set(getCheckedItems());
  if (current.has(key)) current.delete(key);
  else current.add(key);
  const next = [...current];
  writeJson(CHECKED_KEY, next);
  return next;
}
