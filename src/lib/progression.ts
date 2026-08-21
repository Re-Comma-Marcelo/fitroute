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

/** +2 kg for dumbbells (1 kg per side); +2.5 kg for barbell, machine and cable. */
export function incrementoPara(equipamento: string): number {
  return equipamento.trim().toLowerCase().startsWith("dumbbell") ? 2 : 2.5;
}


function media(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function suggestProgression(input: ProgressionInput): ProgressionSuggestion | null {
  const validas = input.anteriores.filter(isSerieValida);
  if (validas.length === 0) return null;

  const pesoAnterior = validas.reduce((max, s) => Math.max(max, s.pesoKg), 0);
  if (pesoAnterior <= 0) return null;

  const pseMedio = media(
    validas.map((s) => s.rpe).filter((v): v is number => typeof v === "number" && v > 0),
  );
  const repsNoTopo = validas.every((s) => s.reps >= input.repsMax);
  const pseOk = pseMedio === null ? true : pseMedio <= 8;
  const pseAlto = pseMedio !== null && pseMedio >= 9.5;
  const incrementoKg = incrementoPara(input.equipamento);
  const aumentou = repsNoTopo && pseOk && !pseAlto;

  const repsMenor = Math.min(...validas.map((s) => s.reps));
  const repsMaior = Math.max(...validas.map((s) => s.reps));
  const repsTexto = repsMenor === repsMaior ? `${repsMaior}` : `${repsMenor}-${repsMaior}`;
  const resumo = `Last session: ${validas.length}x${repsTexto}${
    pseMedio !== null ? ` @ ${fmt(pseMedio)} RPE` : ""
  }.`;

  const motivo = aumentou
    ? `${resumo} Suggested +${fmt(incrementoKg)} kg.`
    : pseAlto
      ? `${resumo} High RPE — hold ${fmt(pesoAnterior)} kg.`
      : `${resumo} Target range is ${input.repsMin}-${input.repsMax} reps — hold ${fmt(pesoAnterior)} kg.`;

  return {
    pesoAnterior,
    pesoSugerido: aumentou ? pesoAnterior + incrementoKg : pesoAnterior,
    incrementoKg,
    aumentou,
    pseMedio,
    motivo,
  };
}
