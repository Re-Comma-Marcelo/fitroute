/**
 * Superset grouping. Kept on the device (no schema change): a map from
 * "<routineId>:<exerciseId>" to a block letter. Exercises sharing a letter are
 * performed back to back and rest only after the last one of the block.
 */

const KEY = "forja.supersets.v1";

export type SupersetMap = Record<string, string>;

function readAll(): SupersetMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as SupersetMap;
  } catch {
    return {};
  }
}

function writeAll(map: SupersetMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

function key(routineId: string, exerciseId: string): string {
  return `${routineId}:${exerciseId}`;
}

/** Group letters for one routine: { exerciseId: "A" }. */
export function supersetsFor(routineId: string): Record<string, string> {
  const all = readAll();
  const prefix = `${routineId}:`;
  const out: Record<string, string> = {};
  Object.entries(all).forEach(([k, v]) => {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = v;
  });
  return out;
}

export function setSuperset(routineId: string, exerciseId: string, group: string | null) {
  const all = readAll();
  if (group) all[key(routineId, exerciseId)] = group;
  else delete all[key(routineId, exerciseId)];
  writeAll(all);
}

/** Next free block letter for the routine (A, B, C…). */
export function nextGroupLetter(routineId: string): string {
  const used = new Set(Object.values(supersetsFor(routineId)));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return "A";
}

/**
 * Display labels in routine order: A1, A2, B1… Exercises without a group get
 * an empty label.
 */
export function blockLabels(routineId: string, exerciseIds: string[]): Record<string, string> {
  const groups = supersetsFor(routineId);
  const seen = new Map<string, number>();
  const labels: Record<string, string> = {};
  exerciseIds.forEach((id) => {
    const group = groups[id];
    if (!group) return;
    const n = (seen.get(group) ?? 0) + 1;
    seen.set(group, n);
    labels[id] = `${group}${n}`;
  });
  return labels;
}

/** True when another exercise of the same block still comes after this one. */
export function hasNextInBlock(routineId: string, exerciseIds: string[], index: number): boolean {
  const groups = supersetsFor(routineId);
  const current = exerciseIds[index];
  if (!current) return false;
  const group = groups[current];
  if (!group) return false;
  return exerciseIds.slice(index + 1).some((id) => groups[id] === group);
}
