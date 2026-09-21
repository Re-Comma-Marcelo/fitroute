import { formatNumber, tx } from "./format";
import type { TipoSerie, WorkoutSet } from "./types";

/**
 * Regra de progressão de carga — pura e testável.
 * Recebe o histórico do último treino concluído do exercício e devolve a sugestão.
 * Nunca importe componentes aqui.
 */

export interface PrevSet {
  pesoKg: number;
  reps: number;
  rpe?: number;
  tipoSerie: TipoSerie;
}

export interface ProgressionInput {
  /** Séries do último treino concluído daquele exercício, na ordem. */
  anteriores: PrevSet[];
  repsMin: number;
  repsMax: number;
  equipamento: string;
  grupoPrimario?: string;
}

export interface ProgressionSuggestion {
  /** Carga de trabalho usada na última sessão. */
  pesoAnterior: number;
  /** Carga sugerida para hoje (igual à anterior quando não há aumento). */
  pesoSugerido: number;
  incrementoKg: number;
  aumentou: boolean;
  /** PSE médio das séries válidas, quando registrado. */
  pseMedio: number | null;
  /** Explicação curta exibida no popover do badge. */
  motivo: string;
}

/** Aquecimento não conta como série válida (nem na numeração, nem no volume). */
export function isSerieValida(set: { tipoSerie: TipoSerie }): boolean {
  return set.tipoSerie !== "aquecimento";
}

/**
 * Série de carga: conta para volume, e1RM e progressão.
 * Séries por tempo guardam segundos em `reps`, então ficam fora dessas contas.
 */
export function isSerieDeCarga(set: { tipoSerie: TipoSerie }): boolean {
  return set.tipoSerie !== "aquecimento" && set.tipoSerie !== "tempo";
}

/** Séries por tempo (isometria/cardio): `reps` são segundos. */
export function isSerieTempo(set: { tipoSerie: TipoSerie }): boolean {
  return set.tipoSerie === "tempo";
}

/**
 * Small muscle groups feel a standard plate/dumbbell jump much more than a
 * squat or a row does — a 2.5 kg bump on lateral raises is often a 20%+
 * jump. These get a smaller step; everything else keeps the standard one.
 */
const SMALL_MUSCLE_GROUPS = new Set([
  "biceps",
  "triceps",
  "shoulders",
  "calves",
  "traps",
  "forearms",
  "core",
  "adductors",
]);

/**
 * +2 kg for dumbbells (1 kg per side), +2.5 kg for barbell/machine/cable —
 * halved for small-muscle-group exercises (biceps, triceps, shoulders,
 * calves, traps, forearms, core, adductors), where that step is
 * disproportionately large relative to the working weight.
 */
export function incrementoPara(equipamento: string, grupoPrimario?: string): number {
  const base = equipamento.trim().toLowerCase().startsWith("dumbbell") ? 2 : 2.5;
  const small = grupoPrimario ? SMALL_MUSCLE_GROUPS.has(grupoPrimario.trim().toLowerCase()) : false;
  return small ? base / 2 : base;
}

function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

function fmt(n: number): string {
  return formatNumber(n, 1);
}

export function suggestProgression(input: ProgressionInput): ProgressionSuggestion | null {
  const validas = input.anteriores.filter(isSerieDeCarga);
  if (validas.length === 0) return null;

  const pesoAnterior = validas.reduce((max, s) => Math.max(max, s.pesoKg), 0);
  if (pesoAnterior <= 0) return null;

  const pseMedio = media(
    validas.map((s) => s.rpe).filter((v): v is number => typeof v === "number" && v > 0),
  );
  const repsNoTopo = validas.every((s) => s.reps >= input.repsMax);
  const pseOk = pseMedio === null ? true : pseMedio <= 8;
  const pseAlto = pseMedio !== null && pseMedio >= 9.5;
  const incrementoKg = incrementoPara(input.equipamento, input.grupoPrimario);
  const aumentou = repsNoTopo && pseOk && !pseAlto;

  const repsMenor = Math.min(...validas.map((s) => s.reps));
  const repsMaior = Math.max(...validas.map((s) => s.reps));
  const repsTexto = repsMenor === repsMaior ? `${repsMaior}` : `${repsMenor}-${repsMaior}`;
  const resumo =
    pseMedio !== null
      ? tx("Last session: {sets}x{reps} @ {rpe} RPE.", {
          sets: validas.length,
          reps: repsTexto,
          rpe: fmt(pseMedio),
        })
      : tx("Last session: {sets}x{reps}.", { sets: validas.length, reps: repsTexto });

  const motivo = aumentou
    ? tx("{summary} Suggested +{inc} kg.", { summary: resumo, inc: fmt(incrementoKg) })
    : pseAlto
      ? tx("{summary} High RPE — hold {weight} kg.", {
          summary: resumo,
          weight: fmt(pesoAnterior),
        })
      : tx("{summary} Target range is {min}-{max} reps — hold {weight} kg.", {
          summary: resumo,
          min: input.repsMin,
          max: input.repsMax,
          weight: fmt(pesoAnterior),
        });

  return {
    pesoAnterior,
    pesoSugerido: aumentou ? pesoAnterior + incrementoKg : pesoAnterior,
    incrementoKg,
    aumentou,
    pseMedio,
    motivo,
  };
}
