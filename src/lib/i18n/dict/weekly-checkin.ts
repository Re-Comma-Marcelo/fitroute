import type { DictFragment } from "../types";

/** Weekly check-in: how the week felt, in a heavy/okay/light spectrum. */
export const dict: DictFragment = {
  pt: {
    Heavy: "Pesada",
    Okay: "Ok",
    Light: "Leve",
    "Last week felt {feeling}.": "A semana passada foi {feeling}.",
    "Felt light — add a small load bump on your first working set of each lift.":
      "Semana leve — adicione um pequeno aumento de carga na primeira série de trabalho de cada exercício.",
    "To-dos for this day (optional)": "Tarefas deste dia (opcional)",
    "Previous day": "Dia anterior",
    "Next day": "Próximo dia",
  },
  nl: {
    Heavy: "Zwaar",
    Okay: "Oké",
    Light: "Licht",
    "Last week felt {feeling}.": "Vorige week voelde {feeling}.",
    "Felt light — add a small load bump on your first working set of each lift.":
      "Voelde licht — voeg een kleine gewichtstoename toe aan de eerste werkset van elke oefening.",
    "To-dos for this day (optional)": "To-do's voor deze dag (optioneel)",
    "Previous day": "Vorige dag",
    "Next day": "Volgende dag",
  },
};
