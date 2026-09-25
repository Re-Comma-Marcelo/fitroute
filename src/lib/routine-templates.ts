/**
 * Ready-made routine skeletons, built from whatever the exercise library has.
 * Pure: the caller saves the returned routines.
 */
import { newRoutineExercise } from "./data/routines";
import type { Exercise, Routine } from "./types";

export type TemplateId = "ppl" | "upper-lower" | "full-body";
export type Pace = "quick" | "relaxed";
export type FocusMuscle = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

/**
 * "Legs" is a template-day label, not a real `grupoPrimario` — the catalog
 * splits legs into Quads/Hamstrings/Glutes/Calves. Without this alias,
 * `pickForGroup` matched nothing for it and every "full body" day silently
 * dropped its leg work.
 */
const GROUP_ALIASES: Record<string, string[]> = {
  Legs: ["Quads", "Hamstrings", "Glutes", "Calves"],
};

/** Same idea, keyed by the onboarding's muscle-focus answer. */
const FOCUS_GROUPS: Record<FocusMuscle, string[]> = {
  chest: ["Chest"],
  back: ["Back"],
  legs: ["Quads", "Hamstrings", "Glutes", "Calves"],
  shoulders: ["Shoulders"],
  arms: ["Biceps", "Triceps"],
  core: ["Core"],
};

export interface RoutineTemplate {
  id: TemplateId;
  /** English source strings — translated at render time. */
  nome: string;
  descricao: string;
  days: { nome: string; groups: string[]; dia?: number }[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "ppl",
    nome: "Push / Pull / Legs",
    descricao: "Three days, one push, one pull, one lower body.",
    days: [
      { nome: "Push", groups: ["Chest", "Shoulders", "Triceps"], dia: 1 },
      { nome: "Pull", groups: ["Back", "Biceps"], dia: 3 },
      { nome: "Legs", groups: ["Legs", "Core"], dia: 5 },
    ],
  },
  {
    id: "upper-lower",
    nome: "Upper / Lower",
    descricao: "Four days alternating upper and lower body.",
    days: [
      { nome: "Upper A", groups: ["Chest", "Back", "Shoulders"], dia: 1 },
      { nome: "Lower A", groups: ["Legs", "Core"], dia: 2 },
      { nome: "Upper B", groups: ["Back", "Shoulders", "Biceps", "Triceps"], dia: 4 },
      { nome: "Lower B", groups: ["Legs", "Core"], dia: 5 },
    ],
  },
  {
    id: "full-body",
    nome: "Full body 3x",
    descricao: "Three full-body sessions a week — good for coming back.",
    days: [
      { nome: "Full body A", groups: ["Legs", "Chest", "Back", "Core"], dia: 1 },
      { nome: "Full body B", groups: ["Legs", "Back", "Shoulders", "Core"], dia: 3 },
      { nome: "Full body C", groups: ["Chest", "Back", "Legs", "Triceps"], dia: 5 },
    ],
  },
];

/** Two exercises per muscle group when available, barbell/machine first. */
function pickForGroup(library: Exercise[], group: string, used: Set<string>, take: number) {
  const rank = (e: Exercise) =>
    e.equipamento === "Barbell" ? 0 : e.equipamento === "Machine" ? 1 : 2;
  const groups = GROUP_ALIASES[group] ?? [group];
  return library
    .filter((e) => groups.includes(e.grupoPrimario) && !used.has(e.id))
    .sort((a, b) => rank(a) - rank(b) || a.nome.localeCompare(b.nome))
    .slice(0, take);
}

/** Builds one Routine per template day. Ids are fresh; nothing is persisted. */
export function buildTemplateRoutines(
  template: RoutineTemplate,
  library: Exercise[],
  translate: (source: string) => string = (s) => s,
  options: { pace?: Pace | null; focusMuscle?: FocusMuscle | null } = {},
): Routine[] {
  const pace = options.pace ?? null;
  const focusGroups = options.focusMuscle ? FOCUS_GROUPS[options.focusMuscle] : [];

  return template.days.map((day) => {
    const used = new Set<string>();
    const exercicios = day.groups
      .flatMap((group) => {
        const standard = day.groups.length > 3 ? 1 : 2;
        const base = pace === "quick" ? 1 : pace === "relaxed" ? standard + 1 : standard;
        const isFocusDay = focusGroups.some((g) => (GROUP_ALIASES[group] ?? [group]).includes(g));
        const take = isFocusDay ? base + 1 : base;
        const picked = pickForGroup(library, group, used, take);
        picked.forEach((e) => used.add(e.id));
        return picked;
      })
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
