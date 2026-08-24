import { fetchTrackedLifts, persistTrackedLift } from "../forja.functions";

let cache: string[] | null = null;

export async function getTrackedLifts(): Promise<string[]> {
  if (!cache) cache = (await fetchTrackedLifts()) as string[];
  return [...cache];
}

export async function setTrackedLift(exerciseId: string, tracked: boolean): Promise<string[]> {
  const current = new Set(cache ?? (await getTrackedLifts()));
  if (tracked) current.add(exerciseId);
  else current.delete(exerciseId);
  cache = [...current];
  await persistTrackedLift({ data: { exerciseId, tracked } });
  return [...cache];
}
