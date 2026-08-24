import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getRoutines } from "@/lib/data/routines";
import { getCoachNotes } from "@/lib/data/coach-notes";
import { getWorkouts, getWorkoutSets } from "@/lib/data/workouts";
import { getTodayPlan } from "./recommendations";
import { getRoutineInsights } from "./exercise-insights";
import { cautionSentence, notesRelevantToRoutine, type GroundedNote } from "./grounding";
import {
  daysSince,
  muscleGroupVolumeThisWeek,
  perWorkoutStats,
  rpeTrend,
  weeklyAggregate,
} from "./signals";
import type { CoachInsight } from "./types";
import type { Exercise, Profile, Routine, Workout, WorkoutSet } from "@/lib/types";

export interface FlaggedExercise {
  exerciseId: string;
  nome: string;
  insight: CoachInsight;
}

export interface TodayCardModel {
  routineId?: string;
  routineName: string;
  /** Collapsed one-liner, e.g. "Upper A today — Bench has room to move…". */
  line: string;
  /** Whether the active choice differs from the coach recommendation. */
  isSwitch: boolean;
  recommendedRoutineId?: string;
  recommendedRoutineName?: string;
  /** Expanded reasoning bullets. */
  why: string[];
  /** Profile-grounded bullets — only the inputs that mattered today. */
  setup: string[];
  /** Grounded cautions from logged notes. */
  cautions: string[];
  flagged: FlaggedExercise[];
  insightsByRoutine: Record<string, Record<string, CoachInsight>>;
}

const TIME_LABEL: Record<Profile["preferredTime"], string> = {
  morning: "mornings",
  midday: "middays",
  afternoon: "afternoons",
  evening: "evenings",
};

export async function getTodayCard(activeRoutineId?: string | null): Promise<TodayCardModel> {
  const [routines, workouts, exercises, profile, notes, plan] = await Promise.all([
    getRoutines(),
    getWorkouts(),
    getExercises(),
    getProfile(),
    getCoachNotes(),
    getTodayPlan(),
  ]);
  const sets = workouts.length
    ? (await Promise.all(workouts.map((w) => getWorkoutSets(w.id)))).flat()
    : [];

  const recommended = routines.find((r) => r.id === plan.recommendation.routineId) ?? routines[0];
  const chosen =
    (activeRoutineId ? routines.find((r) => r.id === activeRoutineId) : undefined) ?? recommended;

  const insightsByRoutine: Record<string, Record<string, CoachInsight>> = {};
  await Promise.all(
    routines.map(async (r) => {
      insightsByRoutine[r.id] = await getRoutineInsights(r, workouts, sets);
    }),
  );

  if (!chosen) {
    return {
      routineName: "No routine yet",
      line: "No routines on file yet — build one and I'll start shaping your week around it.",
      isSwitch: false,
      why: [],
      setup: [],
      cautions: [],
      flagged: [],
      insightsByRoutine,
    };
  }

  const flagged = flaggedFor(chosen, exercises, insightsByRoutine[chosen.id] ?? {});
  const grounded = notesRelevantToRoutine(notes, chosen, exercises);
  const isSwitch = !!recommended && chosen.id !== recommended.id;

  const line = isSwitch
    ? switchLine(chosen, recommended!, grounded)
    : collapsedLine(chosen, flagged, workouts, sets, exercises);

  return {
    routineId: chosen.id,
    routineName: chosen.nome,
    line,
    isSwitch,
    ...(recommended ? { recommendedRoutineId: recommended.id, recommendedRoutineName: recommended.nome } : {}),
    why: whyBullets(chosen, workouts, sets, exercises, flagged),
    setup: setupBullets(chosen, exercises, profile),
    cautions: grounded.slice(0, 2).map(cautionSentence),
    flagged,
    insightsByRoutine,
  };
}

function flaggedFor(
  routine: Routine,
  exercises: Exercise[],
  insights: Record<string, CoachInsight>,
): FlaggedExercise[] {
  const rank = (i: CoachInsight) => (i.severity === "warning" ? 0 : i.severity === "nudge" ? 1 : 2);
  return routine.exercicios
    .map((re) => {
      const insight = insights[re.exerciseId];
      const ex = exercises.find((e) => e.id === re.exerciseId);
      if (!insight || insight.severity === "info" || !ex) return null;
      return { exerciseId: re.exerciseId, nome: ex.nome, insight };
    })
    .filter((v): v is FlaggedExercise => v !== null)
    .sort((a, b) => rank(a.insight) - rank(b.insight))
    .slice(0, 3);
}

function lastSessionOf(routineId: string, workouts: Workout[]): Workout | undefined {
  return workouts
    .filter((w) => w.routineId === routineId && w.finalizadoEm)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];
}

function collapsedLine(
  routine: Routine,
  flagged: FlaggedExercise[],
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: Exercise[],
): string {
  const stalled = flagged.find((f) => f.insight.plateauType === "single-exercise");
  const rising = flagged.find((f) => f.insight.plateauType === "strength");
  const easing = flagged.find((f) => f.insight.plateauType === "fatigue");
  const last = lastSessionOf(routine.id, workouts);
  const load = muscleGroupVolumeThisWeek(workouts, sets, exercises);
  const mainGroup = routine.exercicios
    .map((re) => exercises.find((e) => e.id === re.exerciseId)?.grupoPrimario)
    .find((g): g is string => !!g);
  const fresh = mainGroup ? (load.get(mainGroup) ?? 0) === 0 : false;

  const reasons: string[] = [];
  if (rising) reasons.push(`${rising.nome} has room to move`);
  if (stalled) reasons.push(`${stalled.nome} has sat at the same weight`);
  if (easing) reasons.push(`${easing.nome} needs an easier day`);
  if (fresh && mainGroup) reasons.push(`${mainGroup.toLowerCase()} is fresh this week`);
  else if (last) reasons.push(`you last trained it ${daysSince(last.iniciadoEm)} days ago`);

  const reason = reasons.slice(0, 2).join(" and ");
  return reason ? `${routine.nome} today — ${reason}.` : `${routine.nome} today.`;
}

function switchLine(chosen: Routine, recommended: Routine, grounded: GroundedNote[]): string {
  const head = `Switching to ${chosen.nome} instead of ${recommended.nome}`;
  const first = grounded[0];
  if (!first) return `${head} — noted, I'll plan the rest of the week around it.`;
  return `${head} — ${cautionSentence(first).charAt(0).toLowerCase()}${cautionSentence(first).slice(1)}`;
}

function whyBullets(
  routine: Routine,
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: Exercise[],
  flagged: FlaggedExercise[],
): string[] {
  const out: string[] = [];
  const last = lastSessionOf(routine.id, workouts);
  out.push(
    last
      ? `${routine.nome} was last trained ${daysSince(last.iniciadoEm)} days ago, so those muscles have had time to recover.`
      : `You haven't logged ${routine.nome} yet, so it's the cleanest place to set a baseline.`,
  );

  const load = muscleGroupVolumeThisWeek(workouts, sets, exercises);
  const groups = [...new Set(
    routine.exercicios
      .map((re) => exercises.find((e) => e.id === re.exerciseId)?.grupoPrimario)
      .filter((g): g is string => !!g),
  )];
  const lowest = groups
    .map((g) => ({ g, v: load.get(g) ?? 0 }))
    .sort((a, b) => a.v - b.v)[0];
  if (lowest) {
    out.push(
      lowest.v === 0
        ? `${lowest.g} has had no working volume this week — this session covers it.`
        : `${lowest.g} is your lightest group this week at ${Math.round(lowest.v).toLocaleString("en-US")} kg of volume.`,
    );
  }

  const weeks = weeklyAggregate(workouts, sets);
  if (weeks.length >= 2) {
    const a = weeks[weeks.length - 1]!;
    const b = weeks[weeks.length - 2]!;
    const diff = Math.round(((a.volume - b.volume) / Math.max(1, b.volume)) * 100);
    out.push(
      diff >= 0
        ? `Weekly volume is up ${diff}% on last week, so holding the current load is enough progression.`
        : `Weekly volume is down ${Math.abs(diff)}% on last week — worth banking a solid session rather than a heavy one.`,
    );
  }

  const done = workouts.filter((w) => w.finalizadoEm).slice(-3);
  if (done.length >= 2) {
    const stats = perWorkoutStats(
      done.flatMap((w) => sets.filter((s) => s.workoutId === w.id && s.concluida)),
      done,
    );
    const trend = rpeTrend(stats);
    if (trend === "up") out.push("Your last sessions felt progressively harder, so I'm keeping the jump small.");
    else if (trend === "down") out.push("Your last sessions felt easier than before — a good window to push a lift.");
  }

  for (const f of flagged.slice(0, 2)) out.push(`${f.nome}: ${f.insight.body}`);
  return out;
}

function setupBullets(routine: Routine, exercises: Exercise[], profile: Profile): string[] {
  const out: string[] = [];
  const minutes = routine.exercicios.reduce(
    (sum, re) => sum + re.seriesAlvo * ((re.descansoSeg + 45) / 60),
    0,
  );
  const est = Math.round(minutes / 5) * 5;
  out.push(
    est <= profile.sessionLengthMin
      ? `Roughly ${est} min at your usual pace — inside the ${profile.sessionLengthMin} min you set aside.`
      : `Roughly ${est} min, a bit over your ${profile.sessionLengthMin} min target — drop the last exercise if you're tight on time.`,
  );
  out.push(`You train best in the ${TIME_LABEL[profile.preferredTime]}, so this is queued for today's slot.`);

  const needed = [...new Set(
    routine.exercicios
      .map((re) => exercises.find((e) => e.id === re.exerciseId)?.equipamento)
      .filter((e): e is string => !!e),
  )];
  const missing = needed.filter((e) => !profile.equipment.includes(e));
  if (missing.length) out.push(`Needs ${missing.join(", ")}, which isn't in your equipment list — swap those below.`);
  else if (needed.length) out.push(`Everything here uses gear you have: ${needed.join(", ")}.`);

  const avoided = profile.avoidExercises.filter((a) =>
    routine.exercicios.some((re) => re.exerciseId === a.exerciseId),
  );
  if (avoided.length) {
    for (const a of avoided.slice(0, 2)) {
      const nome = exercises.find((e) => e.id === a.exerciseId)?.nome ?? "An exercise";
      out.push(
        a.reason.trim()
          ? `${nome} is on your avoid list (${a.reason.trim()}) — swap it before you start.`
          : `${nome} is on your avoid list — swap it before you start.`,
      );
    }
  } else {
    const avoidedNames = profile.avoidExercises
      .map((a) => exercises.find((e) => e.id === a.exerciseId)?.nome)
      .filter((n): n is string => !!n);
    if (avoidedNames.length) out.push(`Keeping ${avoidedNames.join(", ")} out of rotation, as you asked.`);
  }
  return out;
}
