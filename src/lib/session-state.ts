import { tx } from "./format";
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

export interface RestState {
  total: number;
  endsAt: number;
}

export interface ActiveSession {
  id: string;
  routineId?: string;
  routineNome: string;
  iniciadoEm: string;
  notas: string;
  exercicios: ActiveExercise[];
  atual: number;
  /** Rest countdown, persisted so it survives navigation/unmount. */
  rest?: RestState | null;
  /** Epoch ms when the clock was paused (null/absent = running). */
  pausadoEm?: number | null;
  /** Seconds already spent paused, accumulated across pauses. */
  pausadoAcumSeg?: number;
}

/** Seconds left on the persisted rest countdown (0 when idle/finished). */
export function restSecondsLeft(session: ActiveSession | null): number {
  if (!session?.rest) return 0;
  return Math.max(0, Math.round((session.rest.endsAt - Date.now()) / 1000));
}

const KEY = "forja.activeSession.v1";
const PENDING_EX_KEY = "forja.pendingExercise.v1";

/** Guards against sessions saved by an older app version (missing arrays crash renders). */
function isValidSession(value: unknown): value is ActiveSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<ActiveSession>;
  if (typeof s.id !== "string" || typeof s.iniciadoEm !== "string") return false;
  if (!Array.isArray(s.exercicios)) return false;
  return s.exercicios.every(
    (ex) => ex && typeof ex === "object" && Array.isArray((ex as ActiveExercise).sets),
  );
}

export function loadActiveSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSession(parsed)) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
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

const PENDING_SLOT_KEY = "forja.pendingSlot.v1";

/** Index of the session exercise that the next library pick should replace. */
export function setPendingReplaceSlot(index: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_SLOT_KEY, String(index));
}

export function takePendingReplaceSlot(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_SLOT_KEY);
  window.localStorage.removeItem(PENDING_SLOT_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
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
      sugReps:
        tipoSerie === "aquecimento" ? (ant?.reps ?? null) : (opts.repsAlvo ?? ant?.reps ?? null),
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

/** Index of the exercise being executed: current one if pending, else first pending. */
/** Session title: blank sessions store an empty name and get a translated label. */
export function sessionLabel(session: { routineNome: string }): string {
  return session.routineNome || tx("Blank workout");
}

export function currentExerciseIndex(session: ActiveSession): number {
  const atual = session.exercicios[session.atual];
  if (atual && !atual.pulado && atual.sets.some((s) => !s.concluida)) return session.atual;
  const idx = session.exercicios.findIndex((ex) => !ex.pulado && ex.sets.some((s) => !s.concluida));
  if (idx >= 0) return idx;
  return Math.max(0, Math.min(session.atual, session.exercicios.length - 1));
}

/** Exercício atual do mini-player: o primeiro com série pendente. */
export function currentExerciseName(session: ActiveSession): string {
  return session.exercicios[currentExerciseIndex(session)]?.nome ?? tx("Free workout");
}

/** Sets with weight and reps typed in but never checked — easy to lose on finish. */
export function filledUncheckedSets(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) =>
      total +
      ex.sets.filter((s) => !s.concluida && s.pesoKg.trim() !== "" && s.reps.trim() !== "").length,
    0,
  );
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
  window.localStorage.setItem(CHOICE_KEY, JSON.stringify({ date: todayKey(), routineId }));
}
