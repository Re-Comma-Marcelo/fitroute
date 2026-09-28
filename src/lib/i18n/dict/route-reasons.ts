import type { DictFragment } from "../types";

/** Why a checkpoint got adjusted, and the route's own pace warning. */
export const dict: DictFragment = {
  pt: {
    "I moved '{title}' two weeks later — you flagged an issue that week.":
      "Movi '{title}' duas semanas para frente — você relatou um problema naquela semana.",
    "I moved '{title}' two weeks later — a performance dip explains the shortfall.":
      "Movi '{title}' duas semanas para frente — uma queda de desempenho explica a diferença.",
    "Re-mapping...": "Remapeando...",
    "Route re-mapped with a steadier pace.": "Rota remapeada com um ritmo mais constante.",
    "Could not re-map the route right now.": "Não consegui remapear a rota agora.",
  },
  nl: {
    "I moved '{title}' two weeks later — you flagged an issue that week.":
      "Ik heb '{title}' twee weken verschoven — je meldde die week een klacht.",
    "I moved '{title}' two weeks later — a performance dip explains the shortfall.":
      "Ik heb '{title}' twee weken verschoven — een prestatiedip verklaart het verschil.",
    "Re-mapping...": "Opnieuw in kaart brengen...",
    "Route re-mapped with a steadier pace.":
      "Route opnieuw in kaart gebracht met een rustiger tempo.",
    "Could not re-map the route right now.": "Kon de route nu niet opnieuw in kaart brengen.",
  },
};
