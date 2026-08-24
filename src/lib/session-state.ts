import { isSerieValida, type PrevSet, type ProgressionSuggestion } from "./progression";
import type { TipoSerie } from "./types";

export interface ActiveSet {
  id: string;
  serieNum: number;
  tipoSerie: TipoSerie;
  pesoKg: string;
  reps: string;
  rpe: string;
  sugPeso: number | null;
  sugReps: number | null;
  /** Coluna ANTERIOR — somente leitura, nunca muda durante a sessão. */
  antPeso: number | null;
  antReps: number | null;
  antRpe: number | null;
  concluida: boolean;
}

export interface ActiveExercise {
  exerciseId: string;
  nome: string;
  grupoPrimario: string;
  equipamento: string;
  descansoSeg: number;
  repsMin: number;
  repsMax: number;
  notas: string;
  pulado: boolean;
  sugestao: ProgressionSuggestion | null;
  sets: ActiveSet[];
}

export interface ActiveSession {
  id: string;
  routineId?: string;
  routineNome: string;
  iniciadoEm: string;
  notas: string;
  exercicios: ActiveExercise[];
  atual: number;
}

const KEY = "forja.activeSession.v1";
const PENDING_EX_KEY = "forja.pendingExercise.v1";

export function loadActiveSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearActiveSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Exercício escolhido na biblioteca, aguardando ser consumido por sessão/rotina. */
export function setPendingExercise(exerciseId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_EX_KEY, exerciseId);
}

export function takePendingExercise(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(PENDING_EX_KEY);
  window.localStorage.removeItem(PENDING_EX_KEY);
  return value;
}

export function makeSets(
  quantidade: number,
  anteriores: PrevSet[],
  opts: { pesoSugerido?: number | null; repsAlvo?: number | null } = {},
): ActiveSet[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const ant = anteriores[i] ?? null;
    const tipoSerie: TipoSerie = ant?.tipoSerie ?? "normal";
    const sugPeso =
      tipoSerie === "aquecimento"
        ? (ant?.pesoKg ?? null)
        : (opts.pesoSugerido ?? ant?.pesoKg ?? null);
    return {
      id: `s_${Math.random().toString(36).slice(2, 9)}`,
      serieNum: i + 1,
      tipoSerie,
      pesoKg: sugPeso !== null ? String(sugPeso) : "",
      // REPS fica vazio para exibir a faixa alvo em cinza; o toque no ✓ aplica sugReps.
      reps: opts.repsAlvo ? String(opts.repsAlvo) : "",
      rpe: "",
      sugPeso,
      sugReps: tipoSerie === "aquecimento" ? (ant?.reps ?? null) : (opts.repsAlvo ?? ant?.reps ?? null),
      antPeso: ant?.pesoKg ?? null,
      antReps: ant?.reps ?? null,
      antRpe: ant?.rpe ?? null,
      concluida: false,
    };
  });
}

/** Numeração exibida: aquecimento é "W", séries válidas contam 1, 2, 3… */
export function serieLabel(sets: ActiveSet[], index: number): string {
  const set = sets[index];
  if (!set) return "";
  if (!isSerieValida(set)) return "W";
  return String(sets.slice(0, index + 1).filter(isSerieValida).length);
}

/** Volume ignora aquecimento. */
export function sessionVolume(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce(
        (sub, s) =>
          s.concluida && isSerieValida(s)
            ? sub + (Number(s.pesoKg) || 0) * (Number(s.reps) || 0)
            : sub,
        0,
      ),
    0,
  );
}

export function sessionSetsDone(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) => total + ex.sets.filter((s) => s.concluida && isSerieValida(s)).length,
    0,
  );
}

export function sessionElapsed(session: ActiveSession): number {
  return Math.max(0, Math.floor((Date.now() - new Date(session.iniciadoEm).getTime()) / 1000));
}

/** Exercício atual do mini-player: o primeiro com série pendente. */
export function currentExerciseName(session: ActiveSession): string {
  const atual = session.exercicios[session.atual];
  if (atual && !atual.pulado && atual.sets.some((s) => !s.concluida)) return atual.nome;
  const pendente = session.exercicios.find((ex) => !ex.pulado && ex.sets.some((s) => !s.concluida));
  return pendente?.nome ?? atual?.nome ?? "Treino livre";
}
const CHOICE_KEY = "forja.todayChoice.v1";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Routine the user picked for today (defaults to the coach recommendation). */
export function loadTodayChoice(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHOICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { date: string; routineId: string };
    return parsed.date === todayKey() ? parsed.routineId : null;
  } catch {
    return null;
  }
}

export function saveTodayChoice(routineId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CHOICE_KEY,
    JSON.stringify({ date: todayKey(), routineId }),
  );
}
