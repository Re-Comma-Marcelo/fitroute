import { nextSetTarget } from "./next-set";
import { isSerieDeCarga, isSerieValida } from "./progression";
import {
  isExerciseDone,
  nextPendingIndex,
  type ActiveExercise,
  type ActiveSession,
  type ActiveSet,
} from "./session-state";

/**
 * Everything the screen has to do after a set is ticked, computed in one
 * synchronous pass over the session. The screen used to read these values out
 * of a `setState` updater, which React may defer when another update (the
 * running clock, a keystroke) is already queued — then the rest never started.
 */
export interface CompleteSetEffects {
  /** Rest to start, in seconds (0 inside a superset chain). */
  restSeconds: number;
  /** True when the set was inside a superset and the next exercise follows at once. */
  superset: boolean;
  /** Next exercise with work left, offered as the hand-off (never forced). */
  nextExerciseIdx: number | null;
  /** True when this tick finished the last working set of the exercise. */
  exerciseDone: boolean;
  /** Weight/reps actually recorded for a valid working set. */
  logged: { pesoKg: number; reps: number } | null;
  /** Coach line describing the target for the next set. */
  targetLine: string | null;
  /** Kg × reps of this set, for the volume feedback. */
  volumeKg: number;
  /** True when the weight beat the best ever logged for this exercise. */
  personalRecord: boolean;
  /** Working sets done before / after, across the whole session. */
  setsDoneBefore: number;
  setsDoneAfter: number;
  setsTotal: number;
}

export interface CompleteSetDeps {
  restFor: (ex: ActiveExercise) => number;
  supersetChain: (session: ActiveSession, exIdx: number) => boolean;
}

function countDone(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) => total + ex.sets.filter((s) => s.concluida && isSerieValida(s)).length,
    0,
  );
}

function countTotal(session: ActiveSession): number {
  return session.exercicios
    .filter((ex) => !ex.pulado)
    .reduce((total, ex) => total + ex.sets.filter(isSerieValida).length, 0);
}

/**
 * Apply the target the app computed to the next pending working set: the grey
 * hint changes, typed values are never overwritten.
 */
export function applyNextTarget(
  ex: ActiveExercise,
  fromSetIdx: number,
  logged: { pesoKg: number; reps: number; rpe: number | null },
): string | null {
  const target = nextSetTarget(ex, logged);
  const next = ex.sets.find((x, i) => i > fromSetIdx && !x.concluida && isSerieValida(x));
  if (!target || !next) return null;
  next.sugPeso = target.pesoKg;
  next.sugReps = target.reps;
  next.pesoKg = "";
  next.reps = "";
  return target.line;
}

/** Tick one set. Returns a new session (deep copy) plus the effects to run. */
export function completeSet(
  session: ActiveSession,
  exIdx: number,
  setIdx: number,
  deps: CompleteSetDeps,
): { session: ActiveSession; effects: CompleteSetEffects | null } {
  const s = structuredClone(session);
  const ex = s.exercicios[exIdx];
  const set = ex?.sets[setIdx];
  if (!ex || !set) return { session, effects: null };

  const setsDoneBefore = countDone(s);

  // Logging in two taps: suggested values are accepted without typing anything.
  if (!set.pesoKg) set.pesoKg = String(set.sugPeso ?? set.antPeso ?? "");
  if (!set.reps) set.reps = String(set.sugReps ?? ex.repsMax);
  set.concluida = true;

  let logged: CompleteSetEffects["logged"] = null;
  let targetLine: string | null = null;
  let personalRecord = false;
  let volumeKg = 0;
  if (isSerieValida(set)) {
    logged = { pesoKg: Number(set.pesoKg) || 0, reps: Number(set.reps) || 0 };
    targetLine = applyNextTarget(ex, setIdx, { ...logged, rpe: Number(set.rpe) || null });
    if (isSerieDeCarga(set)) {
      volumeKg = logged.pesoKg * logged.reps;
      const best = ex.prKg ?? 0;
      if (best > 0 && logged.pesoKg > best && logged.reps > 0) {
        personalRecord = true;
        set.pr = true;
        ex.prKg = logged.pesoKg;
      }
    }
  }

  const superset = deps.supersetChain(s, exIdx);
  const restSeconds = superset ? 0 : deps.restFor(ex);
  // O exercício termina quando as séries de trabalho acabam — e a sessão NÃO
  // se move sozinha: `atual` só muda por toque. Trocar a tela embaixo do dedo
  // no instante do ✓ é o que fazia o app parecer pular exercício.
  const exerciseDone = isExerciseDone(ex);
  const nextExerciseIdx = exerciseDone ? nextPendingIndex(s, exIdx) : null;

  return {
    session: s,
    effects: {
      restSeconds,
      superset,
      nextExerciseIdx,
      exerciseDone,
      logged,
      targetLine,
      volumeKg,
      personalRecord,
      setsDoneBefore,
      setsDoneAfter: countDone(s),
      setsTotal: countTotal(s),
    },
  };
}

/** Untick a set (no effects). */
export function uncompleteSet(
  session: ActiveSession,
  exIdx: number,
  setIdx: number,
): ActiveSession {
  const s = structuredClone(session);
  const set = s.exercicios[exIdx]?.sets[setIdx];
  if (!set) return session;
  set.concluida = false;
  set.pr = false;
  return s;
}

/** Copy the last completed set into the next pending one and tick it. */
export function repeatLastSet(
  session: ActiveSession,
  exIdx: number,
  deps: CompleteSetDeps,
): { session: ActiveSession; effects: CompleteSetEffects | null } {
  const ex = session.exercicios[exIdx];
  if (!ex) return { session, effects: null };
  const feitas = ex.sets.filter((x) => x.concluida);
  const ultima = feitas[feitas.length - 1];
  const proximaIdx = ex.sets.findIndex((x) => !x.concluida);
  if (!ultima || proximaIdx < 0) return { session, effects: null };
  const s = structuredClone(session);
  const proxima = s.exercicios[exIdx]!.sets[proximaIdx]!;
  proxima.pesoKg = ultima.pesoKg;
  proxima.reps = ultima.reps;
  return completeSet(s, exIdx, proximaIdx, deps);
}

export type { ActiveSet };
