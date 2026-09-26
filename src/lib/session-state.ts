import { tx } from "./format";
import type { SetPrescription } from "./prescription";
import {
  isSerieDeCarga,
  isSerieValida,
  type PrevSet,
  type ProgressionSuggestion,
} from "./progression";
import type { ExerciseVariant, TipoSerie } from "./types";

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
  /** Optional context for the coach ("lower back felt tight"). */
  coachNote?: string;
  /** Set live when this set beat the best weight ever logged for the exercise. */
  pr?: boolean;
  /** Which ExerciseVariant this set was/will be logged as. */
  variantId?: string;
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
  /** What the app decided you should lift today (weight, reps, warm-up). */
  prescricao?: SetPrescription;
  /** Heaviest weight ever logged for this exercise, for live PR detection (0 = none). */
  prKg?: number;
  /** Routine exercise this one replaced today (swap), kept through re-swaps. */
  substituiDe?: string;
  /** Alternate ways to perform this exercise (e.g. grip width), when it has more than one. */
  variants?: ExerciseVariant[];
  /** Which variant is currently selected for sets not yet logged. */
  selectedVariantId?: string;
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
  /** Folder the session is filed in: the routine's, else the current one. */
  folderId?: string;
  /** Started as a lighter (deload) session: counts as a variation. */
  deload?: boolean;
  /** Started from a routine that is itself a variation. */
  fromVariation?: boolean;
  /** Rest countdown, persisted so it survives navigation/unmount. */
  rest?: RestState | null;
  /** Epoch ms when the rest countdown hit zero (drives the "overdue" read). */
  restExpirouEm?: number | null;
  /** Epoch ms when the clock was paused (null/absent = running). */
  pausadoEm?: number | null;
  /** Seconds already spent paused, accumulated across pauses. */
  pausadoAcumSeg?: number;
}

/**
 * `next` taking the slot of `prev`: remembers the routine's original exercise
 * across repeated swaps, and forgets it when swapped back.
 */
export function asReplacement(next: ActiveExercise, prev: ActiveExercise): ActiveExercise {
  const original = prev.substituiDe ?? prev.exerciseId;
  const rest = { ...next };
  delete rest.substituiDe;
  return original === next.exerciseId ? rest : { ...rest, substituiDe: original };
}

/** Exercises that stand in for a routine exercise this session. */
export function sessionSwaps(session: ActiveSession): { from: string; ex: ActiveExercise }[] {
  return session.exercicios
    .filter((ex) => ex.substituiDe && !ex.pulado)
    .map((ex) => ({ from: ex.substituiDe!, ex }));
}

/** Seconds left on the persisted rest countdown (0 when idle/finished). */
export function restSecondsLeft(session: ActiveSession | null): number {
  if (!session?.rest) return 0;
  return Math.max(0, Math.round((session.rest.endsAt - Date.now()) / 1000));
}

/** How long the rest window has been over — stops being shown after 10 min. */
export const REST_OVERDUE_WINDOW_SEG = 600;

export function restOverdueSeconds(session: ActiveSession | null): number {
  if (!session?.restExpirouEm || session.rest) return 0;
  const elapsed = Math.floor((Date.now() - session.restExpirouEm) / 1000);
  return elapsed > 0 && elapsed <= REST_OVERDUE_WINDOW_SEG ? elapsed : 0;
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

/**
 * `quantidade` são sempre séries de trabalho. O aquecimento da sessão passada
 * fica de fora do molde: ele é uma escolha do dia (⋯ → aquecimento) e, quando
 * era herdado por posição, comia as vagas das séries válidas — o exercício
 * terminava antes da hora e o app pulava para o próximo.
 */
export function makeSets(
  quantidade: number,
  anteriores: PrevSet[],
  opts: { pesoSugerido?: number | null; repsAlvo?: number | null } = {},
): ActiveSet[] {
  const base = anteriores.filter(isSerieValida);
  return Array.from({ length: quantidade }, (_, i) => {
    const ant = base[i] ?? null;
    const tipoSerie: TipoSerie = ant?.tipoSerie ?? "normal";
    const sugPeso = opts.pesoSugerido ?? ant?.pesoKg ?? null;
    return {
      id: `s_${Math.random().toString(36).slice(2, 9)}`,
      serieNum: i + 1,
      tipoSerie,
      pesoKg: sugPeso !== null ? String(sugPeso) : "",
      // REPS fica vazio para exibir a faixa alvo em cinza; o toque no ✓ aplica sugReps.
      reps: opts.repsAlvo ? String(opts.repsAlvo) : "",
      rpe: "",
      sugPeso,
      sugReps: opts.repsAlvo ?? ant?.reps ?? null,
      antPeso: ant?.pesoKg ?? null,
      antReps: ant?.reps ?? null,
      antRpe: ant?.rpe ?? null,
      concluida: false,
    };
  });
}

/** Séries de trabalho do exercício — o que "3 séries" da rotina quer dizer. */
export function workingSets(ex: ActiveExercise): ActiveSet[] {
  return ex.sets.filter(isSerieValida);
}

export function workingSetsDone(ex: ActiveExercise): number {
  return ex.sets.filter((s) => s.concluida && isSerieValida(s)).length;
}

/**
 * Definição única de "exercício concluído": toda série de trabalho marcada.
 * Aquecimento pendente não segura o exercício aberto nem o encerra antes.
 */
export function isExerciseDone(ex: ActiveExercise): boolean {
  const validas = workingSets(ex);
  if (validas.length === 0) return ex.sets.length > 0 && ex.sets.every((s) => s.concluida);
  return validas.every((s) => s.concluida);
}

/** Exercício que ainda deve trabalho: nem pulado, nem concluído. */
export function isExercisePending(ex: ActiveExercise): boolean {
  return !ex.pulado && !isExerciseDone(ex);
}

/** Próximo exercício com trabalho pendente, olhando para frente e dando a volta. */
export function nextPendingIndex(session: ActiveSession, from: number): number | null {
  const n = session.exercicios.length;
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n;
    if (idx === from) continue;
    const ex = session.exercicios[idx];
    if (ex && isExercisePending(ex)) return idx;
  }
  return null;
}

/** Numeração exibida: aquecimento é "W", séries válidas contam 1, 2, 3… */
export function serieLabel(sets: ActiveSet[], index: number): string {
  const set = sets[index];
  if (!set) return "";
  if (!isSerieValida(set)) return "W";
  return String(sets.slice(0, index + 1).filter(isSerieValida).length);
}

/** Volume ignora aquecimento e séries por tempo. */
export function sessionVolume(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce(
        (sub, s) =>
          s.concluida && isSerieDeCarga(s)
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

/** Wall clock since the session started, ignoring the time it spent paused. */
export function sessionElapsed(session: ActiveSession): number {
  const start = new Date(session.iniciadoEm).getTime();
  const end = session.pausadoEm ?? Date.now();
  const bruto = Math.floor((end - start) / 1000);
  return Math.max(0, bruto - (session.pausadoAcumSeg ?? 0));
}

export function isSessionPaused(session: ActiveSession | null): boolean {
  return Boolean(session?.pausadoEm);
}

/** Toggle pause, folding the paused stretch into the accumulator on resume. */
export function togglePause(session: ActiveSession): ActiveSession {
  if (session.pausadoEm) {
    const extra = Math.max(0, Math.floor((Date.now() - session.pausadoEm) / 1000));
    return {
      ...session,
      pausadoEm: null,
      pausadoAcumSeg: (session.pausadoAcumSeg ?? 0) + extra,
    };
  }
  return { ...session, pausadoEm: Date.now() };
}

/** Index of the exercise being executed: current one if pending, else first pending. */
/** Session title: blank sessions store an empty name and get a translated label. */
export function sessionLabel(session: { routineNome: string }): string {
  return session.routineNome || tx("Blank workout");
}

export function currentExerciseIndex(session: ActiveSession): number {
  const atual = session.exercicios[session.atual];
  if (atual && isExercisePending(atual)) return session.atual;
  const idx = session.exercicios.findIndex(isExercisePending);
  if (idx >= 0) return idx;
  return Math.max(0, Math.min(session.atual, session.exercicios.length - 1));
}

/** Exercício atual do mini-player: o primeiro com série pendente. */
export function currentExerciseName(session: ActiveSession): string {
  return session.exercicios[currentExerciseIndex(session)]?.nome ?? tx("Free workout");
}

/** Values still exactly what the app prefilled (the suggestion) — the person never touched them. */
function isUntouchedSuggestion(s: ActiveSet): boolean {
  return (
    s.sugPeso !== null &&
    s.sugReps !== null &&
    Number(s.pesoKg) === s.sugPeso &&
    Number(s.reps) === s.sugReps
  );
}

/**
 * A set with weight and reps typed in but never checked — easy to lose on finish.
 * A set that only carries the prefilled suggestion doesn't count: offering to
 * include it would log a set that never happened.
 */
export function isFilledUnchecked(s: ActiveSet): boolean {
  return (
    !s.concluida && s.pesoKg.trim() !== "" && s.reps.trim() !== "" && !isUntouchedSuggestion(s)
  );
}

export function filledUncheckedSets(session: ActiveSession): number {
  return session.exercicios.reduce(
    (total, ex) => total + ex.sets.filter(isFilledUnchecked).length,
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
