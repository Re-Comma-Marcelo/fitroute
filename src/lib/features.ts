/**
 * Feature flags for parts of the app that are built but not part of the MVP.
 *
 * Nothing here is deleted — it is hidden by default and can be switched on per
 * device in Profile → Features in testing. Flags live in localStorage, so a
 * flag is off during server rendering and for anyone who never touched it.
 */

import { useSyncExternalStore } from "react";

export type FeatureFlag = "weeklyMenu" | "water";

interface FeatureMeta {
  /** Default state. Everything outside the MVP starts off. */
  on: boolean;
  label: string;
  description: string;
}

export const FEATURES: Record<FeatureFlag, FeatureMeta> = {
  weeklyMenu: {
    on: false,
    label: "Weekly menu and shopping list",
    description:
      "Pick the meals you feel like eating this week and get one shopping list merged from them.",
  },
  water: {
    on: false,
    label: "Water tracking",
    description: "A glasses-of-water counter under the macro rings.",
  },
};

const KEY = "forja.features.v1";
const listeners = new Set<() => void>();

function read(): Partial<Record<FeatureFlag, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<FeatureFlag, boolean>) : {};
  } catch {
    return {};
  }
}

export function isFeatureOn(flag: FeatureFlag): boolean {
  return read()[flag] ?? FEATURES[flag].on;
}

export function setFeature(flag: FeatureFlag, on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...read(), [flag]: on }));
  } catch {
    /* storage unavailable — the flag simply stays at its default */
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-renders the caller when the flag is switched anywhere in the app. */
export function useFeature(flag: FeatureFlag): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isFeatureOn(flag),
    () => FEATURES[flag].on,
  );
}
