/**
 * Ready-made routine skeletons, built from whatever the exercise library has.
 * Pure: the caller saves the returned routines.
 *
 * Each day is a list of movement-pattern slots in priority order, not a list
 * of muscle groups. That is how the split is reasoned about:
 *
 * - Compound lifts first (squat, hinge, horizontal/vertical push and pull),
 *   isolation work after — the big lifts get the freshest sets.
 * - Push and pull, knee- and hip-dominant work stay balanced across the week,
 *   so every major muscle lands ~2x/week (Schoenfeld, Ogborn & Krieger 2016,
 *   frequency meta-analysis).
 * - 5-7 exercises a session (8 at most with a focus muscle). With 2-4 sets
 *   each that keeps a muscle at roughly 6-10 hard sets per session, where the
 *   dose-response curve flattens (Schoenfeld et al. 2017; Pelland et al.
 *   2024): more exercises mostly add fatigue, not growth.
 * - That gives each muscle roughly 6-15 direct sets a week plus indirect
 *   work from the compound lifts — inside or just under the 10-20 weekly
 *   sets commonly cited for hypertrophy, a starting point to build up from.
 *
 * Every slot lists interchangeable candidates; `variant` rotates through
 * them, so "generate a new split" swaps exercises without breaking the logic.
 */
import { newRoutineExercise } from "./data/routines";
import type { Exercise, Routine } from "./types";

export type TemplateId = "ppl" | "upper-lower" | "full-body";
export type Pace = "quick" | "relaxed";
export type FocusMuscle = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

/** One movement pattern in a session: interchangeable exercises, best first. */
interface Slot {
  /** Built-in catalog ids (see data/mocks.ts). */
  candidates: string[];
  /** Muscle group to fall back on when none of the candidates exist. */
  group: string;
  muscle: FocusMuscle;
}

export interface RoutineTemplate {
  id: TemplateId;
  /** English source strings — translated at render time. */
  nome: string;
  descricao: string;
  days: { nome: string; slots: Slot[]; dia?: number }[];
}

const slot = (muscle: FocusMuscle, group: string, ...candidates: string[]): Slot => ({
  candidates,
  group,
  muscle,
});

// Movement patterns, named once so the days below read as a program.
const SQUAT = slot("legs", "Quads", "e7", "e71", "e8", "e72");
const LEG_PRESS = slot("legs", "Quads", "e9", "e13", "e72");
const SINGLE_LEG = slot("legs", "Quads", "e12", "e73", "e11");
const LEG_EXTENSION = slot("legs", "Quads", "e10");
const HINGE = slot("legs", "Hamstrings", "e15", "e75");
const DEADLIFT = slot("legs", "Hamstrings", "e14", "e15");
const HIP_THRUST = slot("legs", "Glutes", "e18", "e76");
const LEG_CURL = slot("legs", "Hamstrings", "e16", "e17", "e74");
const CALVES = slot("legs", "Calves", "e20", "e21");
const BENCH = slot("chest", "Chest", "e1", "e63", "e62");
const INCLINE = slot("chest", "Chest", "e2", "e64", "e62");
const CHEST_PRESS = slot("chest", "Chest", "e63", "e62", "e64");
const CHEST_FLY = slot("chest", "Chest", "e5", "e65", "e4");
const ROW = slot("back", "Back", "e22", "e59", "e58", "e23");
const SUPPORTED_ROW = slot("back", "Back", "e26", "e25", "e58");
const PULLDOWN = slot("back", "Back", "e24", "e61", "e27");
const PULL_UP = slot("back", "Back", "e27", "e61", "e24");
const OVERHEAD_PRESS = slot("shoulders", "Shoulders", "e29", "e30", "e68");
const DB_PRESS = slot("shoulders", "Shoulders", "e30", "e68", "e29");
const LATERAL = slot("shoulders", "Shoulders", "e31", "e66", "e67");
const REAR_DELT = slot("shoulders", "Shoulders", "e69", "e33");
const TRICEPS = slot("arms", "Triceps", "e39", "e56", "e38");
const TRICEPS_OVERHEAD = slot("arms", "Triceps", "e53", "e40", "e38");
const BICEPS = slot("arms", "Biceps", "e36", "e35", "e49");
const BICEPS_LONG = slot("arms", "Biceps", "e46", "e37", "e44");
const CORE = slot("core", "Core", "e79", "e42", "e43");
const CORE_B = slot("core", "Core", "e43", "e80", "e42");

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "ppl",
    nome: "Push / Pull / Legs",
    descricao: "Three days, one push, one pull, one lower body.",
    days: [
      {
        nome: "Push",
        slots: [BENCH, OVERHEAD_PRESS, INCLINE, LATERAL, TRICEPS, CHEST_FLY, TRICEPS_OVERHEAD],
        dia: 1,
      },
      {
        nome: "Pull",
        slots: [PULLDOWN, ROW, SUPPORTED_ROW, REAR_DELT, BICEPS, BICEPS_LONG, CORE],
        dia: 3,
      },
      {
        nome: "Legs",
        slots: [SQUAT, HINGE, LEG_PRESS, LEG_CURL, CALVES, LEG_EXTENSION, CORE_B],
        dia: 5,
      },
    ],
  },
  {
    id: "upper-lower",
    nome: "Upper / Lower",
    descricao: "Four days alternating upper and lower body.",
    days: [
      {
        nome: "Upper A",
        slots: [BENCH, ROW, INCLINE, PULLDOWN, LATERAL, TRICEPS, BICEPS, REAR_DELT],
        dia: 1,
      },
      {
        nome: "Lower A",
        slots: [SQUAT, HINGE, LEG_PRESS, LEG_CURL, CALVES, CORE, LEG_EXTENSION],
        dia: 2,
      },
      {
        nome: "Upper B",
        slots: [
          OVERHEAD_PRESS,
          PULL_UP,
          CHEST_PRESS,
          SUPPORTED_ROW,
          LATERAL,
          TRICEPS_OVERHEAD,
          BICEPS_LONG,
          CHEST_FLY,
        ],
        dia: 4,
      },
      {
        nome: "Lower B",
        slots: [DEADLIFT, SINGLE_LEG, HIP_THRUST, LEG_CURL, CALVES, CORE_B, LEG_EXTENSION],
        dia: 5,
      },
    ],
  },
  {
    id: "full-body",
    nome: "Full body 3x",
    descricao: "Three full-body sessions a week — good for coming back.",
    days: [
      {
        nome: "Full body A",
        slots: [SQUAT, BENCH, ROW, HINGE, LATERAL, TRICEPS, CORE],
        dia: 1,
      },
      {
        nome: "Full body B",
        slots: [DEADLIFT, OVERHEAD_PRESS, PULLDOWN, SINGLE_LEG, BICEPS, LEG_CURL, CORE_B],
        dia: 3,
      },
      {
        nome: "Full body C",
        slots: [LEG_PRESS, INCLINE, SUPPORTED_ROW, HIP_THRUST, REAR_DELT, BICEPS_LONG, CALVES],
        dia: 5,
      },
    ],
  },
];

/** Exercises per session: short, standard or thorough. */
const SESSION_SIZE = { quick: 5, standard: 6, relaxed: 7 } as const;
/** A focus muscle may add one exercise, never past this. */
const MAX_EXERCISES = 8;

/** Equipment that needs nothing but the body is always available. */
const ALWAYS_AVAILABLE = "Bodyweight";

function pickForSlot(
  s: Slot,
  byId: Map<string, Exercise>,
  library: Exercise[],
  used: Set<string>,
  variant: number,
  equipment: string[] | null,
): Exercise | null {
  const fits = (e: Exercise) =>
    !used.has(e.id) &&
    (!equipment?.length || e.equipamento === ALWAYS_AVAILABLE || equipment.includes(e.equipamento));
  const candidates = s.candidates.map((id) => byId.get(id)).filter((e): e is Exercise => !!e);
  const usable = candidates.filter(fits);
  if (usable.length) return usable[variant % usable.length]!;
  // A trimmed library or a home setup: any exercise for the same muscle group.
  const fallback = library.filter((e) => e.grupoPrimario === s.group && fits(e));
  return fallback.length ? fallback[variant % fallback.length]! : null;
}

/** Builds one Routine per template day. Ids are fresh; nothing is persisted. */
export function buildTemplateRoutines(
  template: RoutineTemplate,
  library: Exercise[],
  translate: (source: string) => string = (s) => s,
  options: {
    pace?: Pace | null;
    focusMuscles?: FocusMuscle[];
    /** 0 is the default pick; each step swaps to the next alternative per slot. */
    variant?: number | undefined;
    /** The profile's equipment; empty or missing means a full gym. */
    equipment?: string[] | null | undefined;
  } = {},
): Routine[] {
  const size = SESSION_SIZE[options.pace ?? "standard"];
  const focus = new Set(options.focusMuscles ?? []);
  const variant = Math.max(0, options.variant ?? 0);
  const byId = new Map(library.map((e) => [e.id, e]));

  return template.days.map((day) => {
    // The first `size` slots are the session; one focus slot beyond that may join.
    const chosen = day.slots.slice(0, size);
    // Without a later slot for it, the focus muscle's own pattern gets a second exercise.
    const extra =
      day.slots.slice(size).find((s) => focus.has(s.muscle)) ??
      chosen.find((s) => focus.has(s.muscle));
    if (extra && chosen.length < MAX_EXERCISES) chosen.push(extra);

    const used = new Set<string>();
    const exercicios = chosen
      .map((s) => {
        const picked = pickForSlot(s, byId, library, used, variant, options.equipment ?? null);
        if (picked) used.add(picked.id);
        return picked;
      })
      .filter((e): e is Exercise => !!e)
      .map((exercise, index) => newRoutineExercise(exercise.id, index));

    return {
      id: `r_${Math.random().toString(36).slice(2, 10)}`,
      nome: translate(day.nome),
      descricao: translate(template.descricao),
      exercicios,
      diasSemana: day.dia === undefined ? [] : [day.dia],
    };
  });
}
