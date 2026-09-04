import type { DictFragment } from "../types";

/** Round 17: home protein, body-weight goal bar, diet week training badge,
 *  library recents, progress muscle chips, repeat-yesterday fallback, macro
 *  breakdown macros. */
export const dict: DictFragment = {
  pt: {
    "of {target}g protein": "de {target}g de proteína",
    "{n} {unit} to go": "faltam {n} {unit}",
    "Training day": "Dia de treino",
    "Yesterday had no meals — copied your last planned day instead.":
      "Ontem não houve refeições — copiamos seu último dia planejado.",
    "No recent meals to copy — plan a day first.":
      "Nenhuma refeição recente para copiar — planeje um dia primeiro.",
    Protein: "Proteína",
    Carbs: "Carbo",
    Fat: "Gordura",
  },
  nl: {
    "of {target}g protein": "van {target}g eiwit",
    "{n} {unit} to go": "nog {n} {unit} te gaan",
    "Training day": "Trainingsdag",
    "Yesterday had no meals — copied your last planned day instead.":
      "Gisteren geen maaltijden — je laatst geplande dag is gekopieerd.",
    "No recent meals to copy — plan a day first.":
      "Geen recente maaltijden om te kopiëren — plan eerst een dag.",
    Protein: "Eiwit",
    Carbs: "Koolhydraten",
    Fat: "Vet",
  },
};
