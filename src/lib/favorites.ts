/**
 * Favourite exercises. Local-only (no schema change): a set of exercise ids
 * kept in localStorage so the library can float them to the top.
 */
const KEY = "forja.favoriteExercises.v1";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function isFavorite(exerciseId: string, favorites = getFavorites()): boolean {
  return favorites.includes(exerciseId);
}

/** Adds or removes the exercise and returns the resulting list. */
export function toggleFavorite(exerciseId: string): string[] {
  const current = getFavorites();
  const next = current.includes(exerciseId)
    ? current.filter((id) => id !== exerciseId)
    : [...current, exerciseId];
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
