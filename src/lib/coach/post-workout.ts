/**
 * Post-workout recovery message: how hard the session was relative to the
 * user's recent average, what to do next, and food that fits the macros still
 * open today. Ends with an open door, not a hard CTA.
 */
import { tx } from "@/lib/format";
import type { DayTotals, NutritionTargets } from "@/lib/nutrition-types";

export type SessionIntensity = "heavy" | "normal" | "light";

export interface PostWorkoutInput {
  volumeKg: number;
  durationSeg: number;
  /** Averages over the user's recent finished sessions. */
  avgVolumeKg: number;
  avgDurationSeg: number;
  /** Daily targets minus what today's plan already covers. */
  targets?: NutritionTargets;
  consumed?: DayTotals;
}

export interface PostWorkoutMessage {
  intensity: SessionIntensity;
  recovery: string;
  nutrition: string;
  /** Full message shown in Coach notes. */
  message: string;
}

function foodsFor(open: { proteinG: number; carbsG: number; fatG: number }): string[] {
  const foods: string[] = [];
  if (open.proteinG > 20) {
    foods.push(tx("grilled chicken breast"), tx("Greek yogurt with berries"));
  }
  if (open.carbsG > 40) foods.push(tx("rice with a side of beans"), tx("a banana with oats"));
  if (open.fatG > 15) foods.push(tx("a handful of almonds"));
  if (open.proteinG > 20 && foods.length < 3) foods.push(tx("two eggs on toast"));
  return foods.slice(0, 3);
}

export function buildPostWorkoutMessage(input: PostWorkoutInput): PostWorkoutMessage {
  const volumeRatio = input.avgVolumeKg > 0 ? input.volumeKg / input.avgVolumeKg : 1;
  const durationRatio = input.avgDurationSeg > 0 ? input.durationSeg / input.avgDurationSeg : 1;
  const score = (volumeRatio + durationRatio) / 2;

  const intensity: SessionIntensity = score >= 1.12 ? "heavy" : score <= 0.85 ? "light" : "normal";

  const recovery =
    intensity === "heavy"
      ? tx(
          "That was a heavy one — more volume than your recent average. Keep tomorrow easy: rest or a walk, and get a full night of sleep.",
        )
      : intensity === "light"
        ? tx(
            "Shorter session than usual, so you have room left. Stay active today — a 20 minute walk is enough.",
          )
        : tx("Solid session, right around your usual load. Normal recovery, normal sleep.");

  const open = {
    kcal: Math.max(0, (input.targets?.kcal ?? 0) - (input.consumed?.kcal ?? 0)),
    proteinG: Math.max(0, (input.targets?.proteinG ?? 0) - (input.consumed?.proteinG ?? 0)),
    carbsG: Math.max(0, (input.targets?.carbsG ?? 0) - (input.consumed?.carbsG ?? 0)),
    fatG: Math.max(0, (input.targets?.fatG ?? 0) - (input.consumed?.fatG ?? 0)),
  };
  const foods = foodsFor(open);
  const nutrition = foods.length
    ? tx("You still have {protein}g protein and {carbs}g carbs open today. Good options: {foods}.", {
        protein: Math.round(open.proteinG),
        carbs: Math.round(open.carbsG),
        foods: foods.join(", "),
      })
    : tx("Your macros for today are already covered. Water and a normal meal are enough.");

  return {
    intensity,
    recovery,
    nutrition,
    message: `${recovery} ${nutrition} ${tx("Any questions?")}`,
  };
}
