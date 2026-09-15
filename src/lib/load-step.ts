/**
 * How big a weight jump (or drop) should be for a given exercise.
 * Pure module — no React, no data access.
 *
 * Grounded in the published guidelines rather than a flat "+2.5 kg":
 *  - ACSM position stand (2009): when the lifter clears the target reps,
 *    raise the load 2-10%; the low end for small-muscle exercises, the high
 *    end for large-muscle exercises.
 *  - NSCA (Essentials of Strength Training and Conditioning, "2-for-2" rule):
 *    upper body ~1-2 kg per step, lower body ~2-4 kg per step for most people.
 *  - Helms et al. 2018 (RPE stops): after a set at the limit, back-off sets
 *    drop the load 2-6% so the next sets still land on the target reps.
 *
 * So the jump is a percentage of the load, rounded to what the equipment can
 * actually add (plates, dumbbell rack, weight stack), and it scales with how
 * much muscle the movement uses: a leg press moves further per step than a
 * lateral raise ever should.
 */

export type ExerciseClass = "lower-compound" | "upper-compound" | "isolation";

export interface LoadShape {
  nome?: string | undefined;
  grupoPrimario?: string | undefined;
  equipamento?: string | undefined;
}

/** Percentage of the current load added per progression step. */
const STEP_PCT: Record<ExerciseClass, number> = {
  "lower-compound": 0.05,
  "upper-compound": 0.025,
  isolation: 0.02,
};

/** Ceiling per step so one suggestion never jumps more than the guideline. */
const STEP_MAX_KG: Record<ExerciseClass, number> = {
  "lower-compound": 10,
  "upper-compound": 5,
  isolation: 2.5,
};

/** Load dropped after a set that hit failure (RPE 10) — Helms' 2-6% band. */
const BACKOFF_PCT: Record<ExerciseClass, number> = {
  "lower-compound": 0.05,
  "upper-compound": 0.05,
  isolation: 0.04,
};

/**
 * Above this share of the load, a single jump is too big to trust from one
 * clean set (the next dumbbell after 8 kg is +25%). The lifter has to prove
 * spare reps first.
 */
export const BIG_JUMP_RATIO = 0.12;

const LOWER_GROUPS = new Set([
  "quads",
  "quadriceps",
  "hamstrings",
  "glutes",
  "legs",
  "pernas",
  "quadríceps",
  "quadriceps",
  "posterior",
  "glúteos",
  "gluteos",
]);

const UPPER_COMPOUND_GROUPS = new Set([
  "chest",
  "back",
  "shoulders",
  "peito",
  "costas",
  "ombros",
  "ombro",
]);

/** Name fragments that mark a single-joint / small-muscle movement. */
const ISOLATION_WORDS = [
  "fly",
  "flye",
  "crossover",
  "pec deck",
  "peck deck",
  "curl",
  "extension",
  "extensão",
  "extensao",
  "extensora",
  "flexora",
  "raise",
  "elevação",
  "elevacao",
  "lateral",
  "pullover",
  "kickback",
  "pushdown",
  "shrug",
  "encolhimento",
  "calf",
  "panturrilha",
  "crunch",
  "abdominal",
  "face pull",
  "pull-through",
  "pull through",
  "abduction",
  "adduction",
  "abdutor",
  "adutor",
  "rosca",
  "straight-arm",
  "voador",
  "crucifixo",
  "plank",
  "prancha",
  "rollout",
  "wrist",
  "punho",
  "hyperextension",
  "reverse pec",
];

/** Name fragments that mark a big lower-body pattern regardless of group. */
const LOWER_COMPOUND_WORDS = [
  "squat",
  "agachamento",
  "leg press",
  "deadlift",
  "levantamento terra",
  "terra",
  "hip thrust",
  "elevação pélvica",
  "elevacao pelvica",
  "lunge",
  "afundo",
  "avanço",
  "avanco",
  "passada",
  "step-up",
  "step up",
  "good morning",
  "hack",
  "glute bridge",
];

/** Name fragments that mark a multi-joint upper-body pattern. */
const UPPER_COMPOUND_WORDS = [
  "press",
  "supino",
  "desenvolvimento",
  "row",
  "remada",
  "pull-up",
  "pullup",
  "pull up",
  "chin-up",
  "chinup",
  "chin up",
  "barra fixa",
  "pulldown",
  "puxada",
  "dip",
  "paralela",
  "push-up",
  "pushup",
  "push up",
  "flexão",
  "flexao",
];

function norm(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * Compound vs isolation, upper vs lower. The name decides first (a "Leg
 * Extension" is quads but still isolation); the muscle group breaks ties.
 */
export function classifyExercise(ex: LoadShape): ExerciseClass {
  const name = norm(ex.nome);
  const group = norm(ex.grupoPrimario);

  // Lower-body compound patterns win even when the name also contains
  // "extension"-style words ("Hip Thrust", "Leg Press").
  if (includesAny(name, LOWER_COMPOUND_WORDS)) return "lower-compound";
  // "Leg curl", "calf raise", "pec deck", "lateral raise": single joint.
  if (includesAny(name, ISOLATION_WORDS)) return "isolation";
  if (includesAny(name, UPPER_COMPOUND_WORDS)) return "upper-compound";

  if (LOWER_GROUPS.has(group)) return "lower-compound";
  if (UPPER_COMPOUND_GROUPS.has(group)) return "upper-compound";
  return "isolation";
}

/**
 * Smallest jump the equipment allows in practice: one dumbbell up the rack,
 * a 1.25 kg plate per side, a leg-press plate. This is what the −/+ stepper
 * moves by.
 */
export function plateResolution(ex: LoadShape): number {
  const equip = norm(ex.equipamento);
  if (equip.startsWith("dumbbell") || equip.startsWith("halter")) return 2;
  if (equip.startsWith("kettlebell")) return 4;
  const cls = classifyExercise(ex);
  // Plate-loaded lower-body machines (leg press, hack squat) take 5 kg steps
  // comfortably; a 2.5 kg jump there is noise.
  if (cls === "lower-compound" && (equip.startsWith("machine") || equip.startsWith("máquina")))
    return 5;
  return 2.5;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Weight to add when the lifter earned a progression at `pesoKg`.
 * Percentage of the load by exercise class, rounded to the plate resolution,
 * never below one plate step and never above the class ceiling.
 */
export function loadIncrement(ex: LoadShape, pesoKg: number): number {
  const cls = classifyExercise(ex);
  const res = plateResolution(ex);
  const peso = Number(pesoKg) || 0;
  if (peso <= 0) return res;
  const raw = roundTo(peso * STEP_PCT[cls], res);
  const capped = Math.min(STEP_MAX_KG[cls], raw);
  return Math.max(res, capped);
}

/** True when `incrementKg` is a large share of `pesoKg` (see BIG_JUMP_RATIO). */
export function isBigJump(pesoKg: number, incrementKg: number): boolean {
  const peso = Number(pesoKg) || 0;
  if (peso <= 0) return false;
  return incrementKg / peso > BIG_JUMP_RATIO;
}

/**
 * Weight to take off the bar after a set that reached failure, so the next
 * set can still hit the rep target. Rounded to the plate resolution and at
 * least one step. Returns 0 when the load is too light for a meaningful drop
 * (the caller then trims the rep target instead).
 */
export function failureBackoff(ex: LoadShape, pesoKg: number): number {
  const cls = classifyExercise(ex);
  const res = plateResolution(ex);
  const peso = Number(pesoKg) || 0;
  if (peso <= 0) return 0;
  // Floor, not round: the drop should stay inside the 2-6% band, never above.
  const drop = Math.max(res, Math.floor((peso * BACKOFF_PCT[cls]) / res) * res);
  // A drop bigger than ~15% of the load means the equipment can't express a
  // small back-off (8 kg dumbbells → 6 kg is -25%): keep the weight instead.
  if (drop / peso > 0.15) return 0;
  return drop;
}

/** Percentage (0-100, one decimal) an increment represents at a load. */
export function incrementPct(pesoKg: number, incrementKg: number): number {
  const peso = Number(pesoKg) || 0;
  if (peso <= 0) return 0;
  return Math.round((incrementKg / peso) * 1000) / 10;
}
