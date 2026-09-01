import { fetchBodyWeightLog, persistBodyWeight } from "../forja.functions";
import type { BodyWeightEntry } from "../types";

/**
 * Body weight history, oldest first. Reads degrade to an empty list so a
 * project that has not run the migration yet still renders the screen.
 */
export async function getBodyWeightLog(): Promise<BodyWeightEntry[]> {
  try {
    return (await fetchBodyWeightLog()) as BodyWeightEntry[];
  } catch {
    return [];
  }
}

/** One entry per day: logging twice on the same date overwrites it. */
export async function logBodyWeight(data: string, pesoKg: number): Promise<BodyWeightEntry> {
  return (await persistBodyWeight({ data: { data, pesoKg } })) as BodyWeightEntry;
}
