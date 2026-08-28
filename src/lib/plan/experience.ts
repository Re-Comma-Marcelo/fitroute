import type { Consistency, Experience, TrainingYears } from "./types";

export const TRAINING_YEARS_LABEL: Record<TrainingYears, string> = {
  lt6m: "Less than 6 months",
  "6to12m": "6-12 months",
  "1to3y": "1-3 years",
  "3plus": "3+ years",
};

export const CONSISTENCY_LABEL: Record<Consistency, string> = {
  barely: "Barely trained",
  onOff: "On and off",
  steady: "Steady, most weeks",
};

/**
 * Level is derived, never asked directly: years under load plus how consistent
 * the last six months were. Consistency can pull a level down but never lifts
 * someone above the experience their training age supports.
 */
export function deriveExperience(years: TrainingYears, consistency: Consistency): Experience {
  if (years === "lt6m") return "beginner";
  if (years === "6to12m") return consistency === "steady" ? "intermediate" : "beginner";
  if (years === "1to3y") return consistency === "barely" ? "beginner" : "intermediate";
  return consistency === "steady" ? "advanced" : "intermediate";
}
