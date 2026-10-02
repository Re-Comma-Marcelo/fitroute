/**
 * "Why this weight?" for one exercise: what happened last time, and the
 * rule (with its source) that turns that into today's weight. Mirrors the
 * decisions in progression.ts / prescription.ts — same thresholds — so the
 * explanation can never disagree with the number on screen.
 */
import { tx } from "@/lib/format";
import { RPE_NEAR_FAILURE_MIN } from "@/lib/rpe";
import type { ActiveExercise } from "@/lib/session-state";
import type { SourceId } from "./sources";

export interface WeightRationale {
  /** Last session in one line, or null when there is none. */
  lastTime: string | null;
  /** The rule behind today's weight — one short sentence. */
  why: string;
  sources: SourceId[];
}

export function weightRationale(ex: ActiveExercise): WeightRationale {
  const s = ex.sugestao;
  if (!s) {
    // A deload day drops the suggestion on purpose; the last weights are still on the sets.
    if (ex.sets.some((set) => set.antPeso !== null)) {
      return {
        lastTime: null,
        why: tx("Lighter day: about 10% less, so you recover and come back stronger."),
        sources: [],
      };
    }
    return {
      lastTime: null,
      why: tx(
        "No history yet: pick a weight you could do 2-3 more reps with. The app adjusts from there.",
      ),
      sources: ["refalo2023"],
    };
  }
  // The summary sentence of the progression reason ("Last session: 3x12 @ 7 RPE.").
  const lastTime = s.motivo.split(/(?<=\.)\s/)[0] ?? s.motivo;
  if (s.aumentou) {
    return {
      lastTime,
      why: tx(
        "You hit the top of {min}-{max} reps with reps to spare, so a small step up keeps the muscle challenged.",
        { min: ex.repsMin, max: ex.repsMax },
      ),
      sources: ["acsm2009"],
    };
  }
  if (s.pseMedio !== null && s.pseMedio >= RPE_NEAR_FAILURE_MIN) {
    return {
      lastTime,
      why: tx("That was close to failure. Same weight today: own every rep first, then go up."),
      sources: ["acsm2009", "refalo2023"],
    };
  }
  return {
    lastTime,
    why: tx("Around last time's weight until every set reaches {max} reps; then it goes up.", {
      max: ex.repsMax,
    }),
    sources: ["acsm2009"],
  };
}
