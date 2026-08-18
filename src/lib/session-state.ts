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
  concluida: boolean;
}

export interface ActiveExercise {
  exerciseId: string;
  nome: string;
  grupoPrimario: string;
  descansoSeg: number;
  repsMin: number;
  repsMax: number;
  notas: string;
  pulado: boolean;
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
  sugestoes: { pesoKg: number; reps: number; tipoSerie: TipoSerie }[],
): ActiveSet[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const sug = sugestoes[i] ?? sugestoes[sugestoes.length - 1];
    return {
      id: `s_${Math.random().toString(36).slice(2, 9)}`,
      serieNum: i + 1,
      tipoSerie: sug?.tipoSerie ?? (i === 0 ? "aquecimento" : "normal"),
      pesoKg: "",
      reps: "",
      rpe: "",
      sugPeso: sug ? sug.pesoKg : null,
      sugReps: sug ? sug.reps : null,
      concluida: false,
    };
  });
}

export function sessionVolume(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce(
        (sub, s) => (s.concluida ? sub + (Number(s.pesoKg) || 0) * (Number(s.reps) || 0) : sub),
        0,
      ),
    0,
  );
}

export function sessionSetsDone(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) => total + ex.sets.filter((s) => s.concluida).length,
    0,
  );
}