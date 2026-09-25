import { getCurrentFolder, isStandard, routinesInFolder } from "@/lib/data/folders";
import { getRoutines } from "@/lib/data/routines";
import { getWorkouts, getWorkoutSets } from "@/lib/data/workouts";
import { getExercises } from "@/lib/data/exercises";
import { getProfile } from "@/lib/data/profile";
import { getCoachNotes } from "@/lib/data/coach-notes";
import { tx } from "@/lib/format";
import {
  currentWeekStart,
  daysSince,
  isSameWeightForLastN,
  muscleGroupVolumeThisWeek,
  perWorkoutStats,
  rpeTrend,
  weeklyAggregate,
} from "./signals";
import { getExerciseInsight } from "./exercise-insights";
import type { Routine, Workout, WorkoutSet, Exercise, Profile, CoachNote } from "@/lib/types";
import type { CoachInsight, TodayPlan } from "./types";

export async function getTodayPlan(): Promise<TodayPlan> {
  const [allRoutines, workouts, exercises, profile, notes, folder] = await Promise.all([
    getRoutines(),
    getWorkouts(),
    getExercises(),
    getProfile(),
    getCoachNotes(),
    // Folders are optional (migration not applied yet): fall back to every routine.
    getCurrentFolder().catch(() => null),
  ]);
  // The plan is the current folder: older folders' routines are not suggested.
  const inFolder = folder ? routinesInFolder(allRoutines, folder.id, folder.id) : allRoutines;
  const routines = inFolder.length ? inFolder : allRoutines;
  const allSets = workouts.length
    ? (await Promise.all(workouts.map((w) => getWorkoutSets(w.id)))).flat()
    : [];
  const recommendation = chooseRecommendation(
    routines,
    workouts,
    allSets,
    exercises,
    profile,
    notes,
  );
  const insights = weeklyInsights(workouts, allSets, exercises, profile, notes);
  return { recommendation, insights };
}

function chooseRecommendation(
  routines: Routine[],
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: Exercise[],
  profile: Profile,
  notes: CoachNote[],
): TodayPlan["recommendation"] {
  if (routines.length === 0) {
    return {
      title: tx("Start a blank workout"),
      subtitle: tx("No routines yet"),
      reason: tx("Build a routine first, or log exercises as you go."),
    };
  }

  const muscleLoad = muscleGroupVolumeThisWeek(workouts, sets, exercises);
  const recentInjury = notes.some(
    (n) =>
      n.createdAt > new Date(Date.now() - 7 * 86400000).toISOString() &&
      (n.tags.includes("soreness") || n.tags.includes("injury")),
  );

  // Variations are kept for when life gets in the way, never suggested on their own.
  const standard = routines.filter(isStandard);
  const candidates = standard.length ? standard : routines;
  let best: Routine | null = null;
  let bestScore = -Infinity;
  for (const r of candidates) {
    const last = workouts
      .filter((w) => w.routineId === r.id && w.finalizadoEm)
      .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];
    const days = last ? daysSince(last.iniciadoEm) : 30;
    let score = Math.min(days, 14) * 10;
    for (const re of r.exercicios) {
      const ex = exercises.find((e) => e.id === re.exerciseId);
      if (!ex) continue;
      const load = muscleLoad.get(ex.grupoPrimario) ?? 0;
      score -= load / 1000;
      // Prefer routines that contain stalled exercises.
      const insight = getExerciseInsightSync(re, workouts, sets, exercises);
      if (insight?.plateauType === "single-exercise" || insight?.plateauType === "strength") {
        score += 25;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  const chosen = best ?? candidates[0]!;
  const last = workouts
    .filter((w) => w.routineId === chosen.id && w.finalizadoEm)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))[0];

  let reason = last
    ? tx(
        "{name} was last trained {days} days ago and its main muscle groups are fresh this week.",
        { name: chosen.nome, days: daysSince(last.iniciadoEm) },
      )
    : tx("{name} is a good place to start — it hits the biggest movement patterns.", {
        name: chosen.nome,
      });

  if (recentInjury) {
    reason += ` ${tx("Take the check-in soreness into account and reduce intensity if needed.")}`;
  }

  return {
    routineId: chosen.id,
    routineName: chosen.nome,
    title: tx("Train {name}", { name: chosen.nome }),
    subtitle: tx("{n} exercises · {min} min target", {
      n: chosen.exercicios.length,
      min: profile.sessionLengthMin,
    }),
    reason,
  };
}

function weeklyInsights(
  workouts: Workout[],
  sets: WorkoutSet[],
  exercises: Exercise[],
  profile: Profile,
  notes: CoachNote[],
): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const start = currentWeekStart();
  const thisWeek = workouts.filter((w) => new Date(w.iniciadoEm).toISOString() >= start);

  // Adherence
  if (thisWeek.length < profile.metaTreinosSemana) {
    insights.push({
      id: "adherence-week",
      scope: "week",
      severity: "nudge",
      title: tx("Weekly target"),
      body: tx(
        "You’re at {done} of {goal} sessions this week. A short session still counts if time is tight.",
        { done: thisWeek.length, goal: profile.metaTreinosSemana },
      ),
      plateauType: "adherence",
    });
  }

  // Volume plateau
  const weeks = weeklyAggregate(workouts, sets);
  if (weeks.length >= 2) {
    const last = weeks[weeks.length - 1]!;
    const prev = weeks[weeks.length - 2]!;
    if (last.volume < prev.volume * 0.95) {
      insights.push({
        id: "volume-week",
        scope: "week",
        severity: "warning",
        title: tx("Volume dropped"),
        body: tx(
          "This week’s volume is down from last week. Check recovery, sleep, or stress before pushing harder.",
        ),
        plateauType: "volume",
      });
    }
  }

  // Fatigue plateau
  const lastSessions = workouts
    .filter((w) => w.finalizadoEm)
    .sort((a, b) => b.iniciadoEm.localeCompare(a.iniciadoEm))
    .slice(0, 3);
  if (lastSessions.length >= 2) {
    const lastSets = lastSessions.flatMap((w) =>
      sets.filter((s) => s.workoutId === w.id && s.concluida),
    );
    const stats = perWorkoutStats(lastSets, lastSessions);
    const trend = rpeTrend(stats);
    const lastAvg = stats[stats.length - 1]?.avgRpe;
    if (trend === "up" && lastAvg && lastAvg >= 8.5) {
      insights.push({
        id: "fatigue-week",
        scope: "week",
        severity: "warning",
        title: tx("Fatigue is climbing"),
        body: tx(
          "Your average difficulty is rising while performance is flat. A lighter or deload session next time could help.",
        ),
        plateauType: "fatigue",
      });
    }
  }

  // Check-in flags
  const recentFlag = notes.find(
    (n) =>
      n.createdAt > new Date(Date.now() - 7 * 86400000).toISOString() &&
      (n.tags.includes("too-long") || n.tags.includes("disliked") || n.tags.includes("missed")),
  );
  if (recentFlag) {
    insights.push({
      id: "checkin-flag",
      scope: "week",
      severity: "nudge",
      title: tx("Adjusting to your feedback"),
      body: recentFlag.content,
    });
  }

  return insights.slice(0, 2);
}

// Synchronous version used only inside recommendation scoring.
function getExerciseInsightSync(
  re: Routine["exercicios"][number],
  workouts: Workout[],
  allSets: WorkoutSet[],
  exercises: Exercise[],
): CoachInsight | null {
  const exercise = exercises.find((e) => e.id === re.exerciseId);
  if (!exercise) return null;
  const history = allSets
    .filter((s) => s.exerciseId === re.exerciseId && s.concluida)
    .sort((a, b) => {
      const da = new Date(workouts.find((w) => w.id === a.workoutId)?.iniciadoEm ?? 0).getTime();
      const db = new Date(workouts.find((w) => w.id === b.workoutId)?.iniciadoEm ?? 0).getTime();
      return da - db || a.serieNum - b.serieNum;
    });
  if (history.length === 0) return null;
  const stats = perWorkoutStats(history, workouts);
  if (stats.length === 0) return null;

  if (stats.length >= 3 && isSameWeightForLastN(stats, 3)) {
    return {
      id: `stall-${re.exerciseId}`,
      scope: "exercise",
      severity: "nudge",
      title: tx("Stalled"),
      body: tx(
        "Same weight for three sessions running — aim for an extra rep or add load if form is clean.",
      ),
      plateauType: "single-exercise",
      exerciseId: re.exerciseId,
    };
  }
  return null;
}
