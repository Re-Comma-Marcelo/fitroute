import { getWorkouts, getWorkoutSets } from "@/lib/data/workouts";
import { getExercises } from "@/lib/data/exercises";
import { weeklyAggregate } from "./signals";
import type { CoachInsight } from "./types";

const LEG_GROUPS = ["quads", "hamstrings", "glutes", "calves"];

export async function getNutritionInsight(): Promise<CoachInsight | null> {
  const [workouts, sets, exercises] = await Promise.all([
    getWorkouts(),
    getWorkouts()
      .then((ws) => Promise.all(ws.map((w) => getWorkoutSets(w.id))))
      .then((list) => list.flat()),
    getExercises(),
  ]);

  const weeks = weeklyAggregate(workouts, sets);
  const lastWeek = weeks[weeks.length - 1];
  if (!lastWeek) return null;

  let legVolume = 0;
  for (const s of sets) {
    const ex = exercises.find((e) => e.id === s.exerciseId);
    if (!ex || s.tipoSerie === "aquecimento") continue;
    if (LEG_GROUPS.includes(ex.grupoPrimario.toLowerCase())) {
      legVolume += s.pesoKg * s.reps;
    }
  }

  if (legVolume > 0) {
    return {
      id: "nutrition-leg-volume",
      scope: "nutrition",
      severity: "nudge",
      title: "Protein target",
      body: "Heavy leg volume this week — your protein target is worth hitting exactly.",
    };
  }

  return {
    id: "nutrition-general",
    scope: "nutrition",
    severity: "info",
    title: "Nutrition",
    body: "Meal logging is coming soon. Until then, keep protein consistent with training load.",
  };
}
