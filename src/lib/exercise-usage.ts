/**
 * How often you pick each exercise from the library. Local-only, used to sort
 * the list by "most used" without touching the schema.
 */
const KEY = "forja.exerciseUsage.v1";

type UsageMap = Record<string, number>;

export function getExerciseUsage(): UsageMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as UsageMap) : {};
  } catch {
    return {};
  }
}

export function bumpExerciseUsage(exerciseId: string): UsageMap {
  const next = { ...getExerciseUsage() };
  next[exerciseId] = (next[exerciseId] ?? 0) + 1;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Quota: usage stats are disposable.
    }
  }
  return next;
}
