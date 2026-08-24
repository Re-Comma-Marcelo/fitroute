import type { Exercise, Profile, Routine } from "@/lib/types";

/**
 * Alternatives for one exercise in a routine: same primary muscle group,
 * equipment the user actually has, nothing on the avoid list, and not already
 * part of the routine.
 */
export function swapCandidates(
  exerciseId: string,
  routine: Routine,
  exercises: Exercise[],
  profile: Profile,
  limit = 4,
): Exercise[] {
  const target = exercises.find((e) => e.id === exerciseId);
  if (!target) return [];
  const inRoutine = new Set(routine.exercicios.map((re) => re.exerciseId));
  const avoided = new Set(profile.avoidExercises.map((a) => a.exerciseId));
  return exercises
    .filter(
      (e) =>
        e.id !== exerciseId &&
        e.grupoPrimario === target.grupoPrimario &&
        !inRoutine.has(e.id) &&
        !avoided.has(e.id) &&
        (profile.equipment.length === 0 || profile.equipment.includes(e.equipamento)),
    )
    .slice(0, limit);
}
