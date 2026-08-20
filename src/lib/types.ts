export type Sexo = "masculino" | "feminino" | "outro";
export type NivelAtividade = "sedentario" | "leve" | "moderado" | "intenso" | "atleta";
export type Objetivo = "cutting" | "manutencao" | "bulking";
export type TipoSerie = "aquecimento" | "normal" | "falha" | "drop";
export type OrigemTreino = "rotina" | "branco";

export interface Profile {
  id: string;
  nome: string;
  pesoKg: number;
  alturaCm: number;
  sexo: Sexo;
  nivelAtividade: NivelAtividade;
  objetivo: Objetivo;
  /** Meta de treinos por semana (usada no card de objetivo semanal). */
  metaTreinosSemana: number;
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
  routineId?: string | undefined;
  iniciadoEm: string;
  finalizadoEm?: string | undefined;
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
  rpe?: number | undefined;
  concluida: boolean;
}
