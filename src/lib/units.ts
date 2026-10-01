/**
 * Weight unit preference. Storage is ALWAYS kilograms — this module only
 * converts for display and for what the user types in.
 */

export type WeightUnit = "kg" | "lb";

const KEY = "forja.weightUnit.v1";
const LB_PER_KG = 2.20462262;

let cached: WeightUnit | null = null;
const listeners = new Set<(unit: WeightUnit) => void>();

export function getWeightUnit(): WeightUnit {
  if (cached) return cached;
  if (typeof window === "undefined") return "kg";
  cached = window.localStorage.getItem(KEY) === "lb" ? "lb" : "kg";
  return cached;
}

export function setWeightUnit(unit: WeightUnit) {
  cached = unit;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, unit);
  listeners.forEach((fn) => fn(unit));
}

/** Subscribe to unit changes (returns the unsubscribe function). */
export function onWeightUnitChange(fn: (unit: WeightUnit) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function unitLabel(unit: WeightUnit = getWeightUnit()): string {
  return unit;
}

/** kg -> value shown to the user, rounded to a sane gym precision. */
export function toDisplayWeight(kg: number, unit: WeightUnit = getWeightUnit()): number {
  const value = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(value * 10) / 10;
}

/** value typed by the user -> kg for storage. */
export function fromDisplayWeight(value: number, unit: WeightUnit = getWeightUnit()): number {
  const kg = unit === "lb" ? value / LB_PER_KG : value;
  return Math.round(kg * 1000) / 1000;
}

/**
 * Stepper increment in the active unit. Pounds snap to what gyms actually load:
 * 2.5 lb for the small isolation steps (< 2 kg), 5 lb for plates and dumbbells,
 * and the nearest multiple of 5 lb for the big slide jumps (10 kg → 20 lb,
 * 20 kg → 45 lb).
 */
export function displayStep(incrementKg: number, unit: WeightUnit = getWeightUnit()): number {
  if (unit === "kg") return incrementKg;
  if (incrementKg < 2) return 2.5;
  return Math.max(5, Math.round((incrementKg * LB_PER_KG) / 5) * 5);
}
