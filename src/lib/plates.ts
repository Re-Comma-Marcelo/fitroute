/**
 * Barbell plate math. Pure and unit-agnostic: everything in here is kilograms,
 * the UI converts for display.
 */

const BAR_KEY = "forja.barKg.v1";
const PLATES_KEY = "forja.plateSet.v1";

export const DEFAULT_BAR_KG = 20;
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 2, 1.25];

export interface PlateBreakdown {
  /** Plates for ONE side, heaviest first. */
  perSide: number[];
  /** Weight the breakdown actually reaches (bar + plates on both sides). */
  achievedKg: number;
  /** Difference against the requested weight (0 when exact). */
  offKg: number;
  barKg: number;
}

export function getBarKg(): number {
  if (typeof window === "undefined") return DEFAULT_BAR_KG;
  const raw = Number(window.localStorage.getItem(BAR_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BAR_KG;
}

export function setBarKg(kg: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BAR_KEY, String(kg));
}

export function getPlateSet(): number[] {
  if (typeof window === "undefined") return DEFAULT_PLATES_KG;
  try {
    const raw = window.localStorage.getItem(PLATES_KEY);
    if (!raw) return DEFAULT_PLATES_KG;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_PLATES_KG;
    const plates = parsed.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    return plates.length ? plates.sort((a, b) => b - a) : DEFAULT_PLATES_KG;
  } catch {
    return DEFAULT_PLATES_KG;
  }
}

export function setPlateSet(plates: number[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLATES_KEY, JSON.stringify([...plates].sort((a, b) => b - a)));
}

/** Greedy loading — how a lifter actually loads a bar. */
export function plateBreakdown(
  targetKg: number,
  barKg = getBarKg(),
  plates = getPlateSet(),
): PlateBreakdown {
  const perSide: number[] = [];
  let remainingPerSide = (targetKg - barKg) / 2;
  if (remainingPerSide <= 0) {
    return { perSide, achievedKg: barKg, offKg: Math.round((barKg - targetKg) * 100) / 100, barKg };
  }
  const sorted = [...plates].sort((a, b) => b - a);
  for (const plate of sorted) {
    while (remainingPerSide - plate >= -0.001) {
      perSide.push(plate);
      remainingPerSide = Math.round((remainingPerSide - plate) * 1000) / 1000;
    }
  }
  const achievedKg = Math.round((barKg + perSide.reduce((a, b) => a + b, 0) * 2) * 100) / 100;
  return {
    perSide,
    achievedKg,
    offKg: Math.round((achievedKg - targetKg) * 100) / 100,
    barKg,
  };
}

/** "2×20 + 1×5" style summary of one side. */
export function groupPlates(perSide: number[]): { plate: number; count: number }[] {
  const map = new Map<number, number>();
  perSide.forEach((p) => map.set(p, (map.get(p) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([plate, count]) => ({ plate, count }));
}

/** Only bar-loaded equipment benefits from plate math. */
export function usesPlates(equipamento: string): boolean {
  const e = equipamento.trim().toLowerCase();
  return e.startsWith("barbell") || e.includes("smith") || e.startsWith("plate");
}
