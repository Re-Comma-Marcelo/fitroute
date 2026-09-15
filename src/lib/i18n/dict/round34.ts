import type { DictFragment } from "../types";

/** Load progression by exercise class and failure back-off between sets. */
export const dict: DictFragment = {
  pt: {
    // Between sessions (badge popover)
    "{summary} Suggested +{inc} kg ({pct}%) — {why}":
      "{summary} Sugerido +{inc} kg ({pct}%) — {why}",
    "big lower-body lift, so the step is larger.":
      "exercício grande de perna, então o salto é maior.",
    "upper-body compound, moderate step.": "composto de membros superiores, salto moderado.",
    "small muscle, small step.": "músculo pequeno, salto pequeno.",
    "{summary} Reps are at the top, but the next step is +{pct}% — hold {weight} kg until it feels like RPE {rpe} or easier.":
      "{summary} As reps estão no topo, mas o próximo salto é +{pct}% — mantenha {weight} kg até parecer PSE {rpe} ou mais fácil.",
    "{summary} Reps are at the top, but that was too close to the limit — hold {weight} kg and own it at RPE {rpe}.":
      "{summary} As reps estão no topo, mas foi perto demais do limite — mantenha {weight} kg e domine em PSE {rpe}.",
    // Between sets (target line)
    "Next set: {weight} kg x {reps}. You hit failure — backing the weight off a little so the reps come back.":
      "Próxima série: {weight} kg x {reps}. Você foi à falha — tirando um pouco de peso para as reps voltarem.",
    "Next set: {weight} kg x {reps}. Short of the range, so the weight comes down to get you into it.":
      "Próxima série: {weight} kg x {reps}. Ficou abaixo da faixa, então o peso desce para te colocar nela.",
    "Next set: {weight} kg x {reps}. Failure costs reps — hold the weight and aim a couple lower.":
      "Próxima série: {weight} kg x {reps}. Falha custa reps — mantenha o peso e mire um pouco abaixo.",
  },
  nl: {
    // Between sessions (badge popover)
    "{summary} Suggested +{inc} kg ({pct}%) — {why}":
      "{summary} Voorstel +{inc} kg ({pct}%) — {why}",
    "big lower-body lift, so the step is larger.": "grote beenoefening, dus de stap is groter.",
    "upper-body compound, moderate step.": "samengestelde bovenlichaamoefening, gemiddelde stap.",
    "small muscle, small step.": "kleine spier, kleine stap.",
    "{summary} Reps are at the top, but the next step is +{pct}% — hold {weight} kg until it feels like RPE {rpe} or easier.":
      "{summary} De reps zitten aan de top, maar de volgende stap is +{pct}% — hou {weight} kg aan tot het als RPE {rpe} of lichter voelt.",
    "{summary} Reps are at the top, but that was too close to the limit — hold {weight} kg and own it at RPE {rpe}.":
      "{summary} De reps zitten aan de top, maar dat was te dicht bij de limiet — hou {weight} kg aan en beheers het op RPE {rpe}.",
    // Between sets (target line)
    "Next set: {weight} kg x {reps}. You hit failure — backing the weight off a little so the reps come back.":
      "Volgende set: {weight} kg x {reps}. Je ging tot falen — iets minder gewicht zodat de reps terugkomen.",
    "Next set: {weight} kg x {reps}. Short of the range, so the weight comes down to get you into it.":
      "Volgende set: {weight} kg x {reps}. Onder de range, dus het gewicht gaat omlaag om je erin te krijgen.",
    "Next set: {weight} kg x {reps}. Failure costs reps — hold the weight and aim a couple lower.":
      "Volgende set: {weight} kg x {reps}. Falen kost reps — hou het gewicht vast en mik iets lager.",
  },
};
