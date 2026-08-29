import type { Lang } from "./i18n/types";

export type Sexo = "masculino" | "feminino" | "outro";
export type NivelAtividade = "sedentario" | "leve" | "moderado" | "intenso" | "atleta";
export type Objetivo = "cutting" | "manutencao" | "bulking";
export type TipoSerie = "aquecimento" | "normal" | "falha" | "drop";
export type OrigemTreino = "rotina" | "branco";

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
}

export interface Exercise {
  id: string;
  nome: string;
  grupoPrimario: string;
  gruposSecundarios: string[];
  equipamento: string;
  instrucoes: string;
  midiaUrl?: string;
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
}

export interface CoachNote {
  id: string;
  createdAt: string;
  kind: CoachNoteKind;
  content: string;
  tags: string[];
}
