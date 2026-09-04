/**
 * Local-only nutrition state (no Supabase schema change).
 * Eaten meals, meal favorites and hydration live in localStorage, following
 * the same pattern as src/lib/favorites.ts and src/lib/session-state.ts.
 *
 * These can be promoted to Supabase later without touching the data layer's
 * public accessors in src/lib/data/nutrition.ts.
 */

// ---- Eaten: which planned meals the user actually consumed ---------------

export type EatenMap = Record<string, Partial<Record<string, string>>>;

const EATEN_KEY = "forja.eaten.v1";

export function getEaten(): EatenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EATEN_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as EatenMap) : {};
  } catch {
    return {};
  }
}

function saveEaten(map: EatenMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EATEN_KEY, JSON.stringify(map));
}

/** Marks a meal as eaten for a date+slot, or clears it when `mealId` is null. */
export function setEaten(date: string, slot: string, mealId: string | null): EatenMap {
  const map = getEaten();
  const day = { ...(map[date] ?? {}) };
  if (mealId) day[slot] = mealId;
  else delete day[slot];
  if (Object.keys(day).length) map[date] = day;
  else delete map[date];
  saveEaten(map);
  return map;
}

export function isEaten(date: string, slot: string, map = getEaten()): boolean {
  return Boolean(map[date]?.[slot]);
}

export function clearEatenDay(date: string): EatenMap {
  const map = getEaten();
  delete map[date];
  saveEaten(map);
  return map;
}

// ---- Meal favorites ------------------------------------------------------

const FAV_KEY = "forja.mealFavorites.v1";

export function getMealFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function isMealFavorite(mealId: string, favorites = getMealFavorites()): boolean {
  return favorites.includes(mealId);
}

export function toggleMealFavorite(mealId: string): string[] {
  const current = getMealFavorites();
  const next = current.includes(mealId)
    ? current.filter((id) => id !== mealId)
    : [...current, mealId];
  if (typeof window !== "undefined") window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
  return next;
}

// ---- Custom meals (local fallback when custom_meals table is absent) ------

const CUSTOM_KEY = "forja.customMeals.v1";
import type { Meal } from "./nutrition-types";

export function getLocalCustomMeals(): Meal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Meal[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalCustomMeal(meal: Meal): Meal[] {
  const current = getLocalCustomMeals().filter((m) => m.id !== meal.id);
  const next = [{ ...meal, custom: true }, ...current];
  if (typeof window !== "undefined") window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  return next;
}

export function removeLocalCustomMeal(id: string): Meal[] {
  const next = getLocalCustomMeals().filter((m) => m.id !== id);
  if (typeof window !== "undefined") window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  return next;
}

// ---- Hydration ------------------------------------------------------------

export interface WaterState {
  /** ISO date -> glasses (250ml each) consumed. */
  [date: string]: number;
}

const WATER_KEY = "forja.water.v1";

export function getWater(): WaterState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WATER_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as WaterState) : {};
  } catch {
    return {};
  }
}

export function getWaterForDate(date: string): number {
  return getWater()[date] ?? 0;
}

export function setWaterForDate(date: string, glasses: number): void {
  const map = getWater();
  const v = Math.max(0, Math.round(glasses));
  if (v > 0) map[date] = v;
  else delete map[date];
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WATER_KEY, JSON.stringify(map));
}

/** Default water goal in glasses (250ml each) = 2L. */
export const DEFAULT_WATER_GOAL = 8;

const GOAL_KEY = "forja.waterGoal.v1";

export function getWaterGoal(): number {
  if (typeof window === "undefined") return DEFAULT_WATER_GOAL;
  try {
    const raw = window.localStorage.getItem(GOAL_KEY);
    if (!raw) return DEFAULT_WATER_GOAL;
    const n = Number(JSON.parse(raw));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : DEFAULT_WATER_GOAL;
  } catch {
    return DEFAULT_WATER_GOAL;
  }
}

export function setWaterGoal(glasses: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GOAL_KEY, JSON.stringify(Math.max(1, Math.round(glasses))));
}
