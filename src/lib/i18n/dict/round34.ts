import type { DictFragment } from "../types";

/**
 * Recipes in the meal detail sheet: the "how to make it" section that opens
 * on demand. Only the chrome is translated — the steps and tips themselves
 * are Portuguese catalogue content, like the dish names and ingredients.
 */
export const dict: DictFragment = {
  pt: {
    "How to make it": "Como fazer",
    "{steps} steps · {prepMin} min · {tips} tips": "{steps} passos · {prepMin} min · {tips} dicas",
    "Makes {servings} serving(s)": "Rende {servings} porção(ões)",
    "The quantities below are one full portion — you logged {portion}× this meal, so scale them accordingly.":
      "As quantidades abaixo são de uma porção inteira — você registrou {portion}× esta refeição, então ajuste na mesma proporção.",
    "Tips that make the difference": "Dicas que fazem diferença",
  },
  nl: {
    "How to make it": "Zo maak je het",
    "{steps} steps · {prepMin} min · {tips} tips": "{steps} stappen · {prepMin} min · {tips} tips",
    "Makes {servings} serving(s)": "Goed voor {servings} portie(s)",
    "The quantities below are one full portion — you logged {portion}× this meal, so scale them accordingly.":
      "De hoeveelheden hieronder zijn voor één hele portie — je noteerde {portion}× deze maaltijd, dus reken ze naar verhouding om.",
    "Tips that make the difference": "Tips die het verschil maken",
  },
};
