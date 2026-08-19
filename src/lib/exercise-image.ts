import peito from "@/assets/musculo-peito.jpg";
import costas from "@/assets/musculo-costas.jpg";
import pernas from "@/assets/musculo-pernas.jpg";
import ombros from "@/assets/musculo-ombros.jpg";
import bracos from "@/assets/musculo-bracos.jpg";
import core from "@/assets/musculo-core.jpg";

/** Mapeia grupo muscular -> imagem escura de apoio (apenas apresentação). */
const MAPA: { chaves: string[]; src: string }[] = [
  { chaves: ["peito", "peitoral"], src: peito },
  { chaves: ["costas", "dorsal", "trapézio", "lombar"], src: costas },
  {
    chaves: ["quadríceps", "posterior", "glúteo", "panturrilha", "perna", "adutor"],
    src: pernas,
  },
  { chaves: ["ombro", "deltoide"], src: ombros },
  { chaves: ["bíceps", "tríceps", "antebraço", "braço"], src: bracos },
  { chaves: ["core", "abdômen", "abdominal", "oblíquo"], src: core },
];

export function exerciseImage(grupo?: string | null): string {
  const g = (grupo ?? "").toLowerCase();
  return MAPA.find((m) => m.chaves.some((c) => g.includes(c)))?.src ?? core;
}

export const routineCovers = [peito, costas, pernas, ombros] as const;

/** Capa estável por índice/id da rotina. */
export function routineCover(seed: string): string {
  let n = 0;
  for (const ch of seed) n = (n + ch.charCodeAt(0)) % 997;
  return routineCovers[n % routineCovers.length]!;
}