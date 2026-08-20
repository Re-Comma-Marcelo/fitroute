import { getExercise, getExercises } from "./data/exercises";
import { getRoutine } from "./data/routines";
import { getLastSetsForExercise } from "./data/workouts";
import { suggestProgression, type PrevSet } from "./progression";
import { makeSets, saveActiveSession, type ActiveExercise, type ActiveSession } from "./session-state";

export async function buildActiveExercise(
  exerciseId: string,
  opts: { seriesAlvo?: number; repsMin?: number; repsMax?: number; descansoSeg?: number; notas?: string } = {},
): Promise<ActiveExercise | null> {
  const exercise = await getExercise(exerciseId);
  if (!exercise) return null;
  const last = await getLastSetsForExercise(exerciseId);
  const anteriores: PrevSet[] = last.map((s) => ({
    pesoKg: s.pesoKg,
    reps: s.reps,
    tipoSerie: s.tipoSerie,
    ...(typeof s.rpe === "number" ? { rpe: s.rpe } : {}),
  }));
  const repsMin = opts.repsMin ?? 8;
  const repsMax = opts.repsMax ?? 12;
  const seriesAlvo = opts.seriesAlvo ?? Math.max(3, anteriores.length);
  const sugestao = suggestProgression({
    anteriores,
    repsMin,
    repsMax,
    equipamento: exercise.equipamento,
  });
  return {
    exerciseId,
    nome: exercise.nome,
    grupoPrimario: exercise.grupoPrimario,
    equipamento: exercise.equipamento,
    descansoSeg: opts.descansoSeg ?? 90,
    repsMin,
    repsMax,
    notas: opts.notas ?? "",
    pulado: false,
    sugestao,
    sets: makeSets(seriesAlvo, anteriores, {
      pesoSugerido: sugestao?.pesoSugerido ?? null,
      repsAlvo: null,
    }),
  };
}

export async function startRoutineSession(routineId: string): Promise<ActiveSession | null> {
  const routine = await getRoutine(routineId);
  if (!routine) return null;
  const exercicios: ActiveExercise[] = [];
  for (const rex of [...routine.exercicios].sort((a, b) => a.ordem - b.ordem)) {
    const built = await buildActiveExercise(rex.exerciseId, {
      seriesAlvo: rex.seriesAlvo,
      repsMin: rex.repsMin,
      repsMax: rex.repsMax,
      descansoSeg: rex.descansoSeg,
      notas: rex.notas,
    });
    if (built) exercicios.push(built);
  }
  const session: ActiveSession = {
    id: `w_${Math.random().toString(36).slice(2, 9)}`,
    routineId: routine.id,
    routineNome: routine.nome,
    iniciadoEm: new Date().toISOString(),
    notas: "",
    exercicios,
    atual: 0,
  };
  saveActiveSession(session);
  return session;
}

export async function startBlankSession(): Promise<ActiveSession> {
  // Treino em branco começa com um exercício sugerido para nunca abrir vazio.
  const all = await getExercises();
  const first = all[0];
  const exercicios: ActiveExercise[] = [];
  if (first) {
    const built = await buildActiveExercise(first.id);
    if (built) exercicios.push(built);
  }
  const session: ActiveSession = {
    id: `w_${Math.random().toString(36).slice(2, 9)}`,
    routineNome: "Treino em branco",
    iniciadoEm: new Date().toISOString(),
    notas: "",
    exercicios,
    atual: 0,
  };
  saveActiveSession(session);
  return session;
}