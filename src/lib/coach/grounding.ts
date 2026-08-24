import type { CoachNote, Exercise, Routine } from "@/lib/types";

/**
 * Maps free-text words the user may type in a check-in / issue note to the
 * muscle groups used by the exercise library. Purely lexical: we never infer
 * anything the user did not write.
 */
const GROUP_KEYWORDS: Record<string, string[]> = {
  Chest: ["chest", "pec", "pecs", "bench", "press", "pressing"],
  Shoulders: ["shoulder", "shoulders", "delt", "delts", "overhead", "press", "pressing", "rotator"],
  Back: ["back", "lat", "lats", "row", "rows", "pull-up", "pullup", "pulldown"],
  Traps: ["trap", "traps", "neck", "shrug"],
  Biceps: ["bicep", "biceps", "curl", "curls", "elbow"],
  Triceps: ["tricep", "triceps", "elbow", "extension"],
  Quads: ["quad", "quads", "knee", "knees", "squat", "squats", "leg press"],
  Hamstrings: ["hamstring", "hamstrings", "hams", "deadlift", "rdl"],
  Glutes: ["glute", "glutes", "hip", "hips", "butt"],
  Calves: ["calf", "calves", "ankle", "achilles"],
  Core: ["core", "abs", "ab", "lower back", "spine", "oblique"],
};

const ISSUE_TAGS = ["soreness", "injury", "pain"];

export function noteText(note: CoachNote): string {
  return `${note.content} ${note.tags.join(" ")}`.toLowerCase();
}

/** Muscle groups explicitly mentioned by a note. */
export function noteGroups(note: CoachNote): string[] {
  const text = noteText(note);
  return Object.entries(GROUP_KEYWORDS)
    .filter(([, words]) => words.some((w) => text.includes(w)))
    .map(([group]) => group);
}

export function isIssueNote(note: CoachNote): boolean {
  const text = noteText(note);
  return ISSUE_TAGS.some((t) => text.includes(t)) || note.tags.includes("issue");
}

export function routineGroups(routine: Routine, exercises: Exercise[]): string[] {
  const groups = new Set<string>();
  for (const re of routine.exercicios) {
    const ex = exercises.find((e) => e.id === re.exerciseId);
    if (!ex) continue;
    groups.add(ex.grupoPrimario);
    ex.gruposSecundarios.forEach((g) => groups.add(g));
  }
  return [...groups];
}

export interface GroundedNote {
  note: CoachNote;
  groups: string[];
  /** An exercise in today's routine that touches the flagged group. */
  exerciseName?: string;
  daysAgo: number;
}

/**
 * Notes from the last 21 days that mention a muscle group today's routine
 * actually trains. Most recent first.
 */
export function notesRelevantToRoutine(
  notes: CoachNote[],
  routine: Routine | null | undefined,
  exercises: Exercise[],
): GroundedNote[] {
  if (!routine) return [];
  const groups = routineGroups(routine, exercises);
  const cutoff = Date.now() - 21 * 86400000;
  const out: GroundedNote[] = [];
  for (const note of notes) {
    const ts = new Date(note.createdAt).getTime();
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const hit = noteGroups(note).filter((g) => groups.includes(g));
    if (hit.length === 0) continue;
    const exerciseName = routine.exercicios
      .map((re) => exercises.find((e) => e.id === re.exerciseId))
      .find(
        (ex) =>
          ex &&
          (hit.includes(ex.grupoPrimario) || ex.gruposSecundarios.some((g) => hit.includes(g))),
      )?.nome;
    out.push({
      note,
      groups: hit,
      ...(exerciseName ? { exerciseName } : {}),
      daysAgo: Math.max(0, Math.floor((Date.now() - ts) / 86400000)),
    });
  }
  return out.sort((a, b) => a.daysAgo - b.daysAgo);
}

function whenPhrase(daysAgo: number): string {
  if (daysAgo <= 1) return "yesterday";
  if (daysAgo <= 8) return "last week";
  return `${daysAgo} days ago`;
}

/** A caution sentence built strictly from what the user logged. */
export function cautionSentence(g: GroundedNote): string {
  const part = g.groups[0]!.toLowerCase();
  const where = g.exerciseName ? ` on ${g.exerciseName}` : "";
  const flagged = isIssueNote(g.note) ? "flagged" : "mentioned";
  return `Ease into anything hitting ${part}${where} — you ${flagged} ${part} ${whenPhrase(
    g.daysAgo,
  )} ("${g.note.content.trim()}").`;
}
