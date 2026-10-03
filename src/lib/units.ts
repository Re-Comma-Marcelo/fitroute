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

/**
 * kg -> value shown to the user, rounded to a sane gym precision (0.1). A kg
 * load on the 0.25 kg plate grid is shown exactly, so 11.25 never reads 11.3.
 */
export function toDisplayWeight(kg: number, unit: WeightUnit = getWeightUnit()): number {
  // No clamp here: deltas (−2.5 kg) go through this too.
  if (unit === "kg" && onKgGrid(kg)) return Math.round(kg / KG_GRID) * KG_GRID;
  const value = unit === "lb" ? kg * LB_PER_KG : kg;
  return Math.round(value * 10) / 10;
}

/**
 * Smallest load jump a gym actually offers: fractional plates stop at 0.25 kg,
 * so 10, 10.25, 10.5 and 10.75 exist and 10.05 doesn't.
 */
export const KG_GRID = 0.25;

/** Snaps a kg weight to the nearest 0.25 kg (10.05 → 10, 10.4 → 10.5). */
export function snapKg(kg: number): number {
  if (!Number.isFinite(kg)) return kg;
  return Math.max(0, Math.round(kg / KG_GRID) * KG_GRID);
}

function onKgGrid(kg: number): boolean {
  const units = kg / KG_GRID;
  return Math.abs(units - Math.round(units)) < 1e-6;
}

/**
 * One −/+ press on the 0.25 kg grid. An off-grid weight (10.05) first lands on
 * the nearest grid value in the press direction (10.25 up, 10 down); after that
 * the press moves by the full `deltaKg`.
 */
export function stepKgOnGrid(kg: number, deltaKg: number): number {
  if (deltaKg === 0) return snapKg(kg);
  if (!onKgGrid(kg)) {
    const units = kg / KG_GRID;
    return Math.max(0, (deltaKg > 0 ? Math.ceil(units) : Math.floor(units)) * KG_GRID);
  }
  return snapKg(kg + deltaKg);
}

/**
 * A weight the user logged or copied, snapped to the plate grid of their unit.
 * Only kilograms have one so far; pounds pass through untouched (a 0.25 kg
 * snap would turn 50 lb into 50.2 lb).
 */
export function snapStoredKg(kg: number, unit: WeightUnit = getWeightUnit()): number {
  return unit === "kg" ? snapKg(kg) : kg;
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
