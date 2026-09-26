import type { Exercise, Profile, Routine, SwapReason as Reason } from "@/lib/types";

/** Why the user wants out: shapes the ranking without ever emptying it. */
export type SwapReason = Reason | null;

export interface SwapOptions {
  profile?: Pick<Profile, "equipment" | "avoidExercises"> | null;
  /** Exercises already in the session/routine: pushed down, never removed. */
  excludeIds?: Iterable<string>;
  /** Exercises the user has logged before: a known movement is an easier swap. */
  historyIds?: Iterable<string>;
  /**
   * Exercises already done in place of this one in the current folder: the
   * substitute the user keeps reaching for comes first.
   */
  pastSwapIds?: Iterable<string>;
  reason?: SwapReason;
  limit?: number;
}

/** Movements that load the shoulder overhead or the lower back under a bar. */
const OVERHEAD = /overhead|military|shoulder press|arnold|upright|push press|handstand/i;
const SPINAL_LOAD = /deadlift|good morning|barbell squat|bent over|row.*barbell|barbell row/i;

/** Broad body region, so a thin muscle group still gets neighbours to offer. */
const REGIONS: Record<string, string[]> = {
  legs: ["quads", "hamstrings", "glutes", "calves", "adductors", "abductors", "legs", "perna"],
  push: ["chest", "shoulders", "triceps", "peito", "ombro"],
  pull: ["back", "lats", "traps", "biceps", "forearms", "costas"],
  core: ["core", "abs", "obliques", "abdômen"],
};

function regionOf(group: string): string | null {
  const g = group.toLowerCase();
  for (const [region, keys] of Object.entries(REGIONS)) {
    if (keys.some((k) => g.includes(k))) return region;
  }
  return null;
}

function equipmentRank(equip: string): number {
  const e = equip.toLowerCase();
  if (e.includes("body")) return 0;
  if (e.includes("machine") || e.includes("cable")) return 1;
  if (e.includes("dumb")) return 2;
  return 3;
}

/**
 * Alternatives for one exercise, best first. Same primary muscle is the only
 * hard rule; equipment, history, the avoid list and the reason only reorder.
 * Falls back to secondary muscles when the group is thin, so there is always
 * something to offer.
 */
export function rankSwapCandidates(
  exerciseId: string,
  exercises: Exercise[],
  opts: SwapOptions = {},
): Exercise[] {
  const target = exercises.find((e) => e.id === exerciseId);
  if (!target) return [];
  const limit = opts.limit ?? 4;
  const exclude = new Set(opts.excludeIds ?? []);
  const history = new Set(opts.historyIds ?? []);
  const pastSwaps = new Set(opts.pastSwapIds ?? []);
  const avoided = new Set((opts.profile?.avoidExercises ?? []).map((a) => a.exerciseId));
  const owned = new Set(opts.profile?.equipment ?? []);
  const reason = opts.reason ?? null;

  const region = regionOf(target.grupoPrimario);
  const score = (e: Exercise): number => {
    let s = 0;
    if (e.grupoPrimario === target.grupoPrimario) s += 100;
    else if (e.gruposSecundarios.includes(target.grupoPrimario)) s += 40;
    else if (target.gruposSecundarios.includes(e.grupoPrimario)) s += 30;
    // Last resort for one-of-a-kind groups (adductors, forearms): same body region.
    else if (region && regionOf(e.grupoPrimario) === region) s += 10;
    else return -1;
    if (avoided.has(e.id)) s -= 60;
    if (exclude.has(e.id)) s -= 50;
    if (history.has(e.id)) s += 15;
    if (pastSwaps.has(e.id)) s += 30;
    if (owned.size === 0 || owned.has(e.equipamento)) s += 10;
    // Same equipment keeps the feel of the movement; "busy" means the opposite.
    if (reason === "busy") s += e.equipamento === target.equipamento ? -25 : 12;
    else if (e.equipamento === target.equipamento) s += 6;
    if (reason === "pain") {
      if (OVERHEAD.test(e.nome) || SPINAL_LOAD.test(e.nome)) s -= 30;
      s += (3 - equipmentRank(e.equipamento)) * 4;
    }
    if (reason === "difficulty") {
      // Easier to learn: machine/cable/bodyweight before free weights.
      s += (3 - equipmentRank(e.equipamento)) * 8;
      if (SPINAL_LOAD.test(e.nome)) s -= 20;
    }
    return s;
  };

  return exercises
    .filter((e) => e.id !== exerciseId)
    .map((e) => ({ e, s: score(e) }))
    .filter(({ s }) => s >= 0)
    .sort((a, b) => b.s - a.s || a.e.nome.localeCompare(b.e.nome))
    .slice(0, limit)
    .map(({ e }) => e);
}

/** Alternatives for one exercise in a routine (home card). */
export function swapCandidates(
  exerciseId: string,
  routine: Routine,
  exercises: Exercise[],
  profile: Profile,
  limit = 4,
  pastSwapIds: Iterable<string> = [],
): Exercise[] {
  return rankSwapCandidates(exerciseId, exercises, {
    profile,
    excludeIds: routine.exercicios.map((re) => re.exerciseId),
    pastSwapIds,
    limit,
  });
}

const BUSY = [
  "busy",
  "taken",
  "occupied",
  "in use",
  "ocupad",
  "alguém",
  "alguem",
  "usando",
  "bezet",
  "in gebruik",
];
const PAIN = [
  "hurt",
  "pain",
  "ache",
  "sore",
  "dói",
  "doi",
  "dor",
  "doend",
  "machuc",
  "pijn",
  "zeer",
];
const DIFFICULTY = [
  "hard",
  "difficult",
  "can't",
  "cant",
  "cannot",
  "uncomfortable",
  "awkward",
  "stiff",
  "don't feel",
  "difícil",
  "dificil",
  "não consigo",
  "nao consigo",
  "desconfort",
  "incomod",
  "travad",
  "estranho",
  "não sinto",
  "nao sinto",
  "moeilijk",
  "lukt niet",
  "ongemakkelijk",
];
const SWAP = [
  "alternative",
  "swap",
  "replace",
  "instead",
  "another",
  "other exercise",
  "don't like",
  "dont like",
  "change",
  "alternativa",
  "trocar",
  "troca",
  "substitu",
  "outro",
  "outra",
  "sugest",
  "mudar",
  "não gosto",
  "nao gosto",
  "alternatief",
  "wisselen",
  "ander",
  "vervang",
];

/** What the message is asking for, across en/pt/nl. */
export function detectSwapIntent(text: string): {
  swap: boolean;
  difficulty: boolean;
  reason: SwapReason;
} {
  const q = text.toLowerCase();
  const has = (list: string[]) => list.some((h) => q.includes(h));
  const pain = has(PAIN);
  const busy = has(BUSY);
  const difficulty = has(DIFFICULTY);
  const swap = has(SWAP) || pain || busy;
  const reason: SwapReason = pain
    ? "pain"
    : busy
      ? "busy"
      : difficulty
        ? "difficulty"
        : swap
          ? "preference"
          : null;
  return { swap, difficulty, reason };
}
