import type { Lang } from "./i18n/types";

export type Sexo = "masculino" | "feminino" | "outro";
export type NivelAtividade = "sedentario" | "leve" | "moderado" | "intenso" | "atleta";
export type Objetivo = "cutting" | "manutencao" | "bulking";
/** "tempo" = timed set (plank, carry, cardio): reps holds seconds, weight is optional. */
export type TipoSerie = "aquecimento" | "normal" | "falha" | "drop" | "tempo";
export type OrigemTreino = "rotina" | "branco";

/** Why a session strayed from the folder's standard routine. */
export type SwapReason = "busy" | "social" | "pain" | "equipment" | "difficulty" | "preference";

/** A training block: routines + the sessions done while it was current. */
export type FolderStatus = "atual" | "arquivada" | "modelo";

export interface TrainingFolder {
  id: string;
  nome: string;
  status: FolderStatus;
  /** Template this folder was started from, when any. */
  origemModeloId?: string;
  inicioEm: string;
  fimEm?: string;
}

/** Standard routines lead the folder; variations are kept, quieter. */
export type RoutineRole = "padrao" | "variacao";

export type PreferredTime = "morning" | "midday" | "afternoon" | "evening";
export type CheckInMode = "prompt" | "card";
export type CoachNoteKind = "checkin" | "observation";

export interface AvoidedExercise {
  exerciseId: string;
  reason: string;
}

export interface Profile {
  id: string;
  nome: string;
  pesoKg: number;
  alturaCm: number;
  sexo: Sexo;
  nivelAtividade: NivelAtividade;
  objetivo: Objetivo;
  /** Weekly workout target (used in the weekly goal card). */
  metaTreinosSemana: number;
  equipment: string[];
  avoidExercises: AvoidedExercise[];
  sessionLengthMin: number;
  preferredTime: PreferredTime;
  checkInMode: CheckInMode;
  /** UI language: 'en' | 'pt' | 'nl'. */
  idioma: Lang;
  /** Profile photo (data URL or remote URL). */
  avatarUrl?: string;
  /** Body goal — target bodyweight and the horizon for it. */
  pesoInicialKg?: number;
  pesoMetaKg?: number;
  /** ISO date when the body goal started (used to infer pace). */
  metaIniciadaEm?: string;
  /** ISO date of the goal deadline. */
  metaPrazo?: string;
  /** ISO date the welcome flow was completed on; empty means it still has to run. */
  onboardingConcluidoEm?: string;
  /** Age in years — used by the calorie calculation. Empty means "calculate". */
  idade?: number | undefined;
  /** Manual daily calorie target. Overrides the calculation when set. */
  metaKcal?: number | undefined;
  /** Manual daily protein target in grams. Overrides the calculation when set. */
  metaProteinaG?: number | undefined;
}

export interface Exercise {
  id: string;
  nome: string;
  grupoPrimario: string;
  gruposSecundarios: string[];
  equipamento: string;
  instrucoes: string;
  midiaUrl?: string;
  /** Static thumb path in the public media bucket (derived when absent). */
  thumbUrl?: string;

  isCustom: boolean;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  ordem: number;
  seriesAlvo: number;
  repsMin: number;
  repsMax: number;
  descansoSeg: number;
  notas: string;
}

export interface Routine {
  id: string;
  nome: string;
  descricao: string;
  exercicios: RoutineExercise[];
  /** Planned weekdays, 0 = Sunday … 6 = Saturday. Empty means unscheduled. */
  diasSemana?: number[];
  /** Folder it belongs to; unset means the current folder. */
  folderId?: string;
  papel?: RoutineRole;
  /** Standard routine this variation was derived from (null clears it). */
  variacaoDe?: string | null;
  motivo?: SwapReason | null;
}

/** One body-weight measurement, keyed by ISO date (one per day). */
export interface BodyWeightEntry {
  id: string;
  data: string;
  pesoKg: number;
}

export interface Workout {
  id: string;
  routineId?: string;
  iniciadoEm: string;
  finalizadoEm?: string;
  duracaoSeg: number;
  volumeTotalKg: number;
  notas: string;
  origem: OrigemTreino;
  /** Folder the session was filed in when it was done (a snapshot, never moved). */
  folderId?: string;
  /** True when the session strayed from the standard routine. */
  variacao?: boolean;
  motivo?: SwapReason;
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  ordemExercicio: number;
  serieNum: number;
  tipoSerie: TipoSerie;
  pesoKg: number;
  reps: number;
  rpe?: number;
  concluida: boolean;
  /** Optional short context the user wrote for the coach ("lower back tight"). */
  coachNote?: string;
  /** Standard exercise this one stood in for, when it was a swap. */
  substituiExerciseId?: string;
}

export interface CoachNote {
  id: string;
  createdAt: string;
  kind: CoachNoteKind;
  content: string;
  tags: string[];
}

/** Which adaptive detection produced a coaching message. */
export type CoachingEventKind =
  | "performance_drop"
  | "inactivity_checkin"
  | "weekly_checkin"
  | "post_workout"
  | "chat_swap"
  | "checkpoint_reached"
  | "checkpoint_adjusted"
  | "photo_reminder";

/** Why the coach thinks something happened — drives the tone of the message. */
export type CoachingCause = "cross_training" | "pattern" | "one_off" | "none";

export type CoachingDetail = Record<string, string | number | boolean | null>;

export interface CoachingEvent {
  id: string;
  createdAt: string;
  kind: CoachingEventKind;
  exerciseId?: string | undefined;
  workoutId?: string | undefined;
  cause?: CoachingCause | undefined;
  detail?: CoachingDetail | undefined;
  message: string;
  userReply?: string | undefined;
}

export type CrossTrainingKind = "run" | "sport" | "bike" | "walk" | "other";

export interface CrossTrainingLog {
  id: string;
  kind: CrossTrainingKind;
  /** ISO date (YYYY-MM-DD). */
  data: string;
  duracaoMin: number;
  intensidade: "easy" | "moderate" | "hard";
  nota: string;
}

export interface CoachChatEntry {
  id: string;
  createdAt: string;
  role: "user" | "coach";
  content: string;
  workoutId?: string;
  exerciseId?: string;
}
