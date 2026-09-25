import type { TrainingGoal } from "../types";
import type { Experience } from "./types";

export interface FrequencyGuidance {
  minDays: number;
  maxDays: number;
}

/**
 * Evidence-based weekly training-day ranges, keyed by the onboarding goal and
 * experience level. Sources (see .lovable/plan for the full write-up):
 * - Muscle growth: ~2x/muscle/week is the practical frequency sweet spot
 *   (Schoenfeld, Ogborn & Krieger 2016; Schoenfeld & Grgic 2019 meta-analyses)
 *   — full-body 3-4x/week or a split covers that for most people; higher
 *   frequency only pays off once someone trains enough volume to need it.
 * - Strength: ACSM — 2-3 days/week is optimal for untrained/intermediate
 *   lifters; 4-6 days/week only becomes worthwhile for advanced lifters.
 * - Fat loss: 2-4 days/week resistance training is the evidence-based range;
 *   the calorie deficit drives the fat loss, not the training frequency.
 * - Comeback (returning after a break): stays conservative regardless of
 *   experience — years of prior training don't undo detraining, so even an
 *   "advanced" comeback starts closer to a beginner cadence.
 * Beginner and intermediate are kept close together on purpose: someone with
 * roughly a year of steady training already trains like an intermediate for
 * frequency purposes, not just someone who has trained for 3+ years.
 */
const TABLE: Record<TrainingGoal, Record<Experience, FrequencyGuidance>> = {
  muscle: {
    beginner: { minDays: 3, maxDays: 4 },
    intermediate: { minDays: 3, maxDays: 5 },
    advanced: { minDays: 4, maxDays: 6 },
  },
  strength: {
    beginner: { minDays: 2, maxDays: 3 },
    intermediate: { minDays: 3, maxDays: 4 },
    advanced: { minDays: 4, maxDays: 6 },
  },
  "fat-loss": {
    beginner: { minDays: 2, maxDays: 3 },
    intermediate: { minDays: 2, maxDays: 4 },
    advanced: { minDays: 3, maxDays: 5 },
  },
  comeback: {
    beginner: { minDays: 2, maxDays: 3 },
    intermediate: { minDays: 2, maxDays: 3 },
    advanced: { minDays: 3, maxDays: 4 },
  },
};

export function frequencyGuidance(goal: TrainingGoal, experience: Experience): FrequencyGuidance {
  return TABLE[goal][experience];
}

/** Human-readable label for the goal, for prompt context (not user-facing UI). */
export const GOAL_PROMPT_LABEL: Record<TrainingGoal, string> = {
  muscle: "muscle growth (hypertrophy)",
  strength: "strength",
  "fat-loss": "fat loss",
  comeback: "returning to training after a break",
};
