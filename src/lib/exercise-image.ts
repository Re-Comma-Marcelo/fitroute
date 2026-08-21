import peito from "@/assets/musculo-peito.jpg";
import costas from "@/assets/musculo-costas.jpg";
import pernas from "@/assets/musculo-pernas.jpg";
import ombros from "@/assets/musculo-ombros.jpg";
import bracos from "@/assets/musculo-bracos.jpg";
import core from "@/assets/musculo-core.jpg";

/** Maps muscle group -> fallback image for exercise thumbnails and covers. */
const MAPA: { chaves: string[]; src: string }[] = [
  { chaves: ["chest", "peito", "peitoral"], src: peito },
  { chaves: ["back", "costas", "dorsal", "traps", "lats", "lat"], src: costas },
  {
    chaves: ["quads", "hamstrings", "glutes", "calves", "legs", "adductor", "quadríceps", "posterior", "glúteo", "panturrilha", "perna", "adutor"],
    src: pernas,
  },
  { chaves: ["shoulders", "delts", "ombro", "deltoide"], src: ombros },
  { chaves: ["biceps", "triceps", "forearms", "arms", "bíceps", "tríceps", "antebraço", "braço"], src: bracos },
  { chaves: ["core", "abs", "abdomen", "obliques", "abdômen", "abdominal", "oblíquo"], src: core },
];

export function exerciseImage(grupo?: string | null): string {
  const g = (grupo ?? "").toLowerCase();
  return MAPA.find((m) => m.chaves.some((c) => g.includes(c)))?.src ?? core;
}

export const routineCovers = [peito, costas, pernas, ombros] as const;

/** Stable cover by routine index/id. */
export function routineCover(seed: string): string {
  let n = 0;
  for (const ch of seed) n = (n + ch.charCodeAt(0)) % 997;
  return routineCovers[n % routineCovers.length]!;
}
