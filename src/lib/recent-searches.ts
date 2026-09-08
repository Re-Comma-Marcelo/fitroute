/** Last search terms, kept on the device so the empty search screen is useful. */

const KEY = "forja.recentSearches.v1";
const MAX = 6;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberSearch(term: string) {
  const clean = term.trim();
  if (typeof window === "undefined" || clean.length < 2) return;
  const next = [
    clean,
    ...getRecentSearches().filter((v) => v.toLowerCase() !== clean.toLowerCase()),
  ].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
