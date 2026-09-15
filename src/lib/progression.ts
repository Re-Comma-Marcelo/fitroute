import { formatNumber, tx } from "./format";
import {
  classifyExercise,
  incrementPct,
  isBigJump,
  loadIncrement,
  type ExerciseClass,
} from "./load-step";
import type { TipoSerie } from "./types";

/**
 * Regra de progressão de carga — pura e testável.
 * Recebe o histórico do último treino concluído do exercício e devolve a sugestão.
 * Nunca importe componentes aqui.
 *
 * Dupla progressão com autorregulação por PSE (ACSM 2009 / NSCA "2-for-2"):
 * a carga só sobe quando todas as séries chegaram ao topo da faixa E o
 * esforço deixou reps sobrando. O tamanho do salto vem de `load-step.ts`:
 * percentual da carga por classe do exercício (leg press sobe mais que
 * elevação lateral), arredondado ao que o equipamento permite.
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
  /** Nome e grupo muscular: decidem se o exercício é composto ou isolado. */
  nome?: string;
  grupoPrimario?: string;
}

export interface ProgressionSuggestion {
  /** Carga de trabalho usada na última sessão. */
  pesoAnterior: number;
  /** Carga sugerida para hoje (igual à anterior quando não há aumento). */
  pesoSugerido: number;
  incrementoKg: number;
  /** Incremento como % da carga anterior (uma casa decimal). */
  incrementoPct: number;
  /** Classe do exercício que definiu o tamanho do salto. */
  classe: ExerciseClass;
  aumentou: boolean;
  /** PSE médio das séries válidas, quando registrado. */
  pseMedio: number | null;
  /** Explicação curta exibida no popover do badge. */
  motivo: string;
}

/** PSE médio máximo para subir a carga; mais rígido quando o salto é grande. */
export const RPE_INCREASE_MAX = 8;
export const RPE_INCREASE_MAX_BIG_JUMP = 7;
/** A partir daqui a sessão foi no limite: segura a carga. */
export const RPE_HOLD_MIN = 9.5;

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
  const shape = {
    nome: input.nome,
    grupoPrimario: input.grupoPrimario,
    equipamento: input.equipamento,
  };
  const classe = classifyExercise(shape);
  const incrementoKg = loadIncrement(shape, pesoAnterior);
  const pct = incrementPct(pesoAnterior, incrementoKg);
  const saltoGrande = isBigJump(pesoAnterior, incrementoKg);

  const repsNoTopo = validas.every((s) => s.reps >= input.repsMax);
  // A big relative jump (next dumbbell up = +25%) needs proof of spare reps:
  // RPE 7 or better, or — without RPE — two reps past the top of the range.
  const pseLimite = saltoGrande ? RPE_INCREASE_MAX_BIG_JUMP : RPE_INCREASE_MAX;
  const pseOk =
    pseMedio === null
      ? !saltoGrande || validas.every((s) => s.reps >= input.repsMax + 2)
      : pseMedio <= pseLimite;
  const pseAlto = pseMedio !== null && pseMedio >= RPE_HOLD_MIN;
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

  let motivo: string;
  if (aumentou) {
    motivo = tx("{summary} Suggested +{inc} kg ({pct}%) — {why}", {
      summary: resumo,
      inc: fmt(incrementoKg),
      pct: fmt(pct),
      why: classReason(classe),
    });
  } else if (pseAlto) {
    motivo = tx("{summary} High RPE — hold {weight} kg.", {
      summary: resumo,
      weight: fmt(pesoAnterior),
    });
  } else if (repsNoTopo && saltoGrande) {
    motivo = tx(
      "{summary} Reps are at the top, but the next step is +{pct}% — hold {weight} kg until it feels like RPE {rpe} or easier.",
      {
        summary: resumo,
        pct: fmt(pct),
        weight: fmt(pesoAnterior),
        rpe: RPE_INCREASE_MAX_BIG_JUMP,
      },
    );
  } else if (repsNoTopo) {
    motivo = tx(
      "{summary} Reps are at the top, but that was too close to the limit — hold {weight} kg and own it at RPE {rpe}.",
      {
        summary: resumo,
        weight: fmt(pesoAnterior),
        rpe: RPE_INCREASE_MAX,
      },
    );
  } else {
    motivo = tx("{summary} Target range is {min}-{max} reps — hold {weight} kg.", {
      summary: resumo,
      min: input.repsMin,
      max: input.repsMax,
      weight: fmt(pesoAnterior),
    });
  }

  return {
    pesoAnterior,
    pesoSugerido: aumentou ? Math.round((pesoAnterior + incrementoKg) * 100) / 100 : pesoAnterior,
    incrementoKg,
    incrementoPct: pct,
    classe,
    aumentou,
    pseMedio,
    motivo,
  };
}

/** Why the step is the size it is, in one clause. */
export function classReason(classe: ExerciseClass): string {
  switch (classe) {
    case "lower-compound":
      return tx("big lower-body lift, so the step is larger.");
    case "upper-compound":
      return tx("upper-body compound, moderate step.");
    default:
      return tx("small muscle, small step.");
  }
}
