import type { DictFragment } from "../types";

/** Cross-training log: the new "swim" kind and distance/pace fields. */
export const dict: DictFragment = {
  pt: {
    Swim: "Natação",
    "Distance (km)": "Distância (km)",
    "optional, but lets me compute your pace": "opcional, mas permite calcular seu ritmo",
    "{speed} km/h": "{speed} km/h",
    "{pace} min/km": "{pace} min/km",
  },
  nl: {
    Swim: "Zwemmen",
    "Distance (km)": "Afstand (km)",
    "optional, but lets me compute your pace": "optioneel, maar dan kan ik je tempo berekenen",
    "{speed} km/h": "{speed} km/u",
    "{pace} min/km": "{pace} min/km",
  },
};
