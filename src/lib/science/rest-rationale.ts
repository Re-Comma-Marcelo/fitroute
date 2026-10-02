/**
 * Which study backs an exercise's rest. Heavy, low-rep work gets ~3 min:
 * Schoenfeld et al. 2016 found 3-min rests built more strength and muscle
 * than 1-min rests in trained men. For lighter work the exact length matters
 * little once it's past ~60 s (Singer et al. 2024 meta-analysis), so the app
 * keeps those shorter to save time. The rest values themselves come from
 * restForExercise() in prescription.ts.
 */
import type { SourceId } from "./sources";

/** Rests from this long on are the "heavy work, rest fully" case. */
const LONG_REST_SEC = 150;

export function restSources(seconds: number): SourceId[] {
  return seconds >= LONG_REST_SEC ? ["schoenfeld2016rest"] : ["singer2024"];
}
