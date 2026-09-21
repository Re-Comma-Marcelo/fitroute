import { getExercise, getExercises } from "./data/exercises";
import { getRoutine } from "./data/routines";
import { getLastSetsForExercise, getPersonalRecord } from "./data/workouts";
import { isSerieValida, suggestProgression, type PrevSet } from "./progression";
import { prescribeExercise, restForExercise } from "./prescription";
import {
  makeSets,
  saveActiveSession,
  type ActiveExercise,
  type ActiveSession,
} from "./session-state";

export async function buildActiveExercise(
  exerciseId: string,
  opts: {
    seriesAlvo?: number;
    repsMin?: number;
    repsMax?: number;
    descansoSeg?: number;
    notas?: string;
    /** Lighter/deload session: fewer sets and ~10% less load. */
    deload?: boolean;
  } = {},
): Promise<ActiveExercise | null> {
  const exercise = await getExercise(exerciseId);
  if (!exercise) return null;
  const last = await getLastSetsForExercise(exerciseId);
  // Best weight so far: lets the session celebrate a record the moment it happens.
  const prKg = await getPersonalRecord(exerciseId).catch(() => 0);
  const anteriores: PrevSet[] = last.map((s) => ({
    pesoKg: s.pesoKg,
    reps: s.reps,
    tipoSerie: s.tipoSerie,
    ...(typeof s.rpe === "number" ? { rpe: s.rpe } : {}),
  }));
  const repsMin = opts.repsMin ?? 8;
  const repsMax = opts.repsMax ?? 12;
  // Só séries de trabalho contam: o aquecimento da última sessão não infla nem
  // encolhe o número de séries do dia.
  const baseSeries = opts.seriesAlvo ?? Math.max(3, anteriores.filter(isSerieValida).length);
  const seriesAlvo = opts.deload ? Math.max(2, baseSeries - 1) : baseSeries;
  const sugestao = suggestProgression({
    anteriores,
    repsMin,
    repsMax,
    equipamento: exercise.equipamento,
    grupoPrimario: exercise.grupoPrimario,
  });
  const lastWeight = anteriores.find((a) => a.tipoSerie !== "aquecimento")?.pesoKg ?? null;
  const pesoSugerido = opts.deload
    ? lastWeight !== null
      ? Math.round(lastWeight * 0.9 * 2) / 2
      : null
    : (sugestao?.pesoSugerido ?? null);
  // The app prescribes the work: weight/reps from the estimated 1RM and RPE trend.
  const prescricao = opts.deload
    ? null
    : prescribeExercise({ ...exercise, repsMin, repsMax }, anteriores);
  // 90 s is the generic placeholder rest, not user intent: derive it from how
  // heavy the prescribed range is instead.
  const rest =
    opts.descansoSeg && opts.descansoSeg > 0 && opts.descansoSeg !== 90
      ? opts.descansoSeg
      : restForExercise({ ...exercise, repsMin, repsMax });
  return {
    exerciseId,
    nome: exercise.nome,
    grupoPrimario: exercise.grupoPrimario,
    equipamento: exercise.equipamento,
    descansoSeg: rest,
    repsMin,
    repsMax,
    notas: opts.notas ?? "",
    pulado: false,
    sugestao: opts.deload ? null : sugestao,
    ...(prescricao ? { prescricao } : {}),
    prKg,
    sets: makeSets(seriesAlvo, anteriores, {
      pesoSugerido: prescricao ? prescricao.pesoKg : pesoSugerido,
      repsAlvo: prescricao ? prescricao.reps : null,
    }),
  };
}

export interface StartRoutineOptions {
  /** Per-session exercise substitutions: original exerciseId -> replacement. */
  swaps?: Record<string, string>;
  /** Lighter session: fewer sets, ~10% less load. */
  deload?: boolean;
}

export async function startRoutineSession(
  routineId: string,
  opts: StartRoutineOptions = {},
): Promise<ActiveSession | null> {
  const routine = await getRoutine(routineId);
  if (!routine) return null;
  const exercicios: ActiveExercise[] = [];
  for (const rex of [...routine.exercicios].sort((a, b) => a.ordem - b.ordem)) {
    const built = await buildActiveExercise(opts.swaps?.[rex.exerciseId] ?? rex.exerciseId, {
      seriesAlvo: rex.seriesAlvo,
      repsMin: rex.repsMin,
      repsMax: rex.repsMax,
      descansoSeg: rex.descansoSeg,
      notas: rex.notas,
      ...(opts.deload ? { deload: true } : {}),
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
    // Empty marker: the label is translated at render time.
    routineNome: "",
    iniciadoEm: new Date().toISOString(),
    notas: "",
    exercicios,
    atual: 0,
  };
  saveActiveSession(session);
  return session;
}
