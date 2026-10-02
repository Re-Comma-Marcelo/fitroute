/**
 * Display names for the catalog's muscle groups and equipment. The stored
 * values stay English (they are data: filters, progression rules and the AI
 * read them); only what's shown follows the language. A separate table, not
 * the source-string dictionary: "Back" is already "Terug"/"Voltar" there.
 */
import { activeLocale } from "./format";

type Table = Record<string, string>;

const MUSCLES: Record<"nl" | "pt", Table> = {
  nl: {
    Chest: "Borst",
    Back: "Rug",
    "Lower back": "Onderrug",
    Shoulders: "Schouders",
    Biceps: "Biceps",
    Triceps: "Triceps",
    Forearms: "Onderarmen",
    Traps: "Trapezius",
    Core: "Core",
    Quads: "Quadriceps",
    Hamstrings: "Hamstrings",
    Glutes: "Bilspieren",
    Calves: "Kuiten",
    Adductors: "Adductoren",
    Legs: "Benen",
    Arms: "Armen",
  },
  pt: {
    Chest: "Peito",
    Back: "Costas",
    "Lower back": "Lombar",
    Shoulders: "Ombros",
    Biceps: "Bíceps",
    Triceps: "Tríceps",
    Forearms: "Antebraços",
    Traps: "Trapézio",
    Core: "Core",
    Quads: "Quadríceps",
    Hamstrings: "Posteriores",
    Glutes: "Glúteos",
    Calves: "Panturrilhas",
    Adductors: "Adutores",
    Legs: "Pernas",
    Arms: "Braços",
  },
};

const EQUIPMENT: Record<"nl" | "pt", Table> = {
  nl: {
    Barbell: "Halterstang",
    Dumbbells: "Dumbbells",
    Machine: "Machine",
    Cable: "Kabel",
    Bodyweight: "Lichaamsgewicht",
    Kettlebell: "Kettlebell",
    Bands: "Elastieken",
  },
  pt: {
    Barbell: "Barra",
    Dumbbells: "Halteres",
    Machine: "Máquina",
    Cable: "Polia",
    Bodyweight: "Peso corporal",
    Kettlebell: "Kettlebell",
    Bands: "Elásticos",
  },
};

function lang(): "nl" | "pt" | null {
  const locale = activeLocale().toLowerCase();
  if (locale.startsWith("nl")) return "nl";
  if (locale.startsWith("pt")) return "pt";
  return null;
}

/** "Chest" -> "Borst" in Dutch; unknown or custom groups are shown as stored. */
export function muscleLabel(group: string | null | undefined): string {
  if (!group) return "";
  const l = lang();
  return (l && MUSCLES[l][group]) || group;
}

export function equipmentLabel(equipment: string | null | undefined): string {
  if (!equipment) return "";
  const l = lang();
  return (l && EQUIPMENT[l][equipment]) || equipment;
}
