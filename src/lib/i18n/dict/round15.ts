import type { DictFragment } from "../types";

/** Rest days, calculated set prescriptions and translated nutrition coach notes. */
export const dict: DictFragment = {
  pt: {
    // Rest days
    "Rest day": "Dia de descanso",
    "Rest of the day": "Descanso pelo resto do dia",
    "Train anyway": "Treinar mesmo assim",
    "You already trained today — the rest of the day is recovery.":
      "Você já treinou hoje — o resto do dia é recuperação.",
    "{done} of {goal} sessions logged this week.":
      "{done} de {goal} treinos registrados nesta semana.",
    "Eat enough protein and sleep well; that's where the session pays off.":
      "Coma proteína suficiente e durma bem; é aí que o treino rende.",
    "You've hit your {goal} sessions this week — today is a rest day.":
      "Você já fez seus {goal} treinos nesta semana — hoje é descanso.",
    "Extra sessions on top of your target mostly add fatigue, not progress.":
      "Treinos além da meta geralmente somam fadiga, não progresso.",
    "Train again on the first day of next week, or add one only if you feel fresh.":
      "Volte a treinar no primeiro dia da próxima semana, ou treine hoje só se estiver bem.",
    "You trained yesterday and still have {left} days for {remaining} sessions.":
      "Você treinou ontem e ainda tem {left} dias para {remaining} treinos.",
    "Spacing sessions out keeps each one hard enough to drive progress.":
      "Espaçar os treinos mantém cada um forte o suficiente para gerar progresso.",
    "You flagged soreness recently, so an extra day helps.":
      "Você relatou dor recentemente, então um dia extra ajuda.",
    "Light walking or mobility today is plenty.":
      "Uma caminhada leve ou mobilidade já basta hoje.",
    "You flagged soreness and trained yesterday — take today off.":
      "Você relatou dor e treinou ontem — descanse hoje.",
    "{remaining} sessions still fit in the {left} days left.":
      "Ainda cabem {remaining} treinos nos {left} dias restantes.",
    // Prescription
    "Heavy range ({min}-{max} reps): rest ~{rest} min so force output comes back.":
      "Faixa pesada ({min}-{max} reps): descanse ~{rest} min para recuperar a força.",
    "{min}-{max} reps: ~{rest} min rest keeps the reps honest without cooling down.":
      "{min}-{max} reps: ~{rest} min de descanso mantém as repetições honestas sem esfriar.",
    "High reps: short rest ({rest} s) keeps the set quality and the pump.":
      "Muitas repetições: descanso curto ({rest} s) mantém a qualidade e a congestão.",
    "{weight} kg x {reps} — last time was near your limit, so hold here and own every rep.":
      "{weight} kg x {reps} — na última vez você chegou perto do limite, então mantenha e domine cada repetição.",
    "{weight} kg x {reps} — should feel heavy, but you need all {reps} reps.":
      "{weight} kg x {reps} — deve ser pesado, mas você precisa fazer todas as {reps} repetições.",
    "{weight} kg x {reps} — aim for all {reps}, stop one rep before form breaks.":
      "{weight} kg x {reps} — busque todas as {reps} e pare uma repetição antes de perder a técnica.",
    "First set is a warm-up: {weight} kg x 12, easy — just prime the movement.":
      "A primeira série é aquecimento: {weight} kg x 12, leve — só para ativar o movimento.",
    "Do this one last": "Deixar este para o final",
    // Nutrition coach
    "Post-workout window": "Janela pós-treino",
    "Fuel up before training": "Se alimente antes de treinar",
    "Protein still open": "Proteína em aberto",
    "Protein has been low": "A proteína está baixa",
    "Plan your meals": "Planeje suas refeições",
    "Today's nutrition": "Nutrição de hoje",
    "{kcal} of {target} kcal planned ({pct}%) · {protein}/{proteinTarget}g protein · {carbs}g carbs.":
      "{kcal} de {target} kcal planejadas ({pct}%) · {protein}/{proteinTarget}g de proteína · {carbs}g de carboidrato.",
    "{protein}g protein still open.": "Faltam {protein}g de proteína.",
    "Protein target is within reach.": "A meta de proteína está ao alcance.",
  },
  nl: {
    // Rest days
    "Rest day": "Rustdag",
    "Rest of the day": "Rust voor de rest van de dag",
    "Train anyway": "Toch trainen",
    "You already trained today — the rest of the day is recovery.":
      "Je hebt vandaag al getraind — de rest van de dag is herstel.",
    "{done} of {goal} sessions logged this week.":
      "{done} van {goal} sessies deze week gelogd.",
    "Eat enough protein and sleep well; that's where the session pays off.":
      "Eet genoeg proteïne en slaap goed; daar betaalt de sessie zich uit.",
    "You've hit your {goal} sessions this week — today is a rest day.":
      "Je hebt je {goal} sessies deze week gehaald — vandaag is een rustdag.",
    "Extra sessions on top of your target mostly add fatigue, not progress.":
      "Extra sessies boven je doel voegen vooral vermoeidheid toe, geen progressie.",
    "Train again on the first day of next week, or add one only if you feel fresh.":
      "Train weer op de eerste dag van volgende week, of alleen vandaag als je fris bent.",
    "You trained yesterday and still have {left} days for {remaining} sessions.":
      "Je hebt gisteren getraind en hebt nog {left} dagen voor {remaining} sessies.",
    "Spacing sessions out keeps each one hard enough to drive progress.":
      "Sessies spreiden houdt elke sessie zwaar genoeg voor progressie.",
    "You flagged soreness recently, so an extra day helps.":
      "Je gaf recent spierpijn aan, dus een extra dag helpt.",
    "Light walking or mobility today is plenty.":
      "Rustig wandelen of mobiliteit is vandaag genoeg.",
    "You flagged soreness and trained yesterday — take today off.":
      "Je gaf spierpijn aan en trainde gisteren — neem vandaag vrij.",
    "{remaining} sessions still fit in the {left} days left.":
      "Er passen nog {remaining} sessies in de resterende {left} dagen.",
    // Prescription
    "Heavy range ({min}-{max} reps): rest ~{rest} min so force output comes back.":
      "Zware range ({min}-{max} reps): rust ~{rest} min zodat je kracht terugkomt.",
    "{min}-{max} reps: ~{rest} min rest keeps the reps honest without cooling down.":
      "{min}-{max} reps: ~{rest} min rust houdt de reps eerlijk zonder af te koelen.",
    "High reps: short rest ({rest} s) keeps the set quality and the pump.":
      "Veel reps: korte rust ({rest} s) houdt de setkwaliteit en de pump vast.",
    "{weight} kg x {reps} — last time was near your limit, so hold here and own every rep.":
      "{weight} kg x {reps} — vorige keer zat je tegen je limiet, dus hou dit aan en beheers elke rep.",
    "{weight} kg x {reps} — should feel heavy, but you need all {reps} reps.":
      "{weight} kg x {reps} — mag zwaar voelen, maar je moet alle {reps} reps halen.",
    "{weight} kg x {reps} — aim for all {reps}, stop one rep before form breaks.":
      "{weight} kg x {reps} — ga voor alle {reps} en stop één rep voordat je techniek breekt.",
    "First set is a warm-up: {weight} kg x 12, easy — just prime the movement.":
      "Eerste set is een warming-up: {weight} kg x 12, licht — alleen om de beweging te activeren.",
    "Do this one last": "Doe deze als laatste",
    // Nutrition coach
    "Post-workout window": "Herstelmoment na de training",
    "Fuel up before training": "Eet iets voor je training",
    "Protein still open": "Proteïne nog open",
    "Protein has been low": "Je proteïne is laag",
    "Plan your meals": "Plan je maaltijden",
    "Today's nutrition": "Voeding van vandaag",
    "{kcal} of {target} kcal planned ({pct}%) · {protein}/{proteinTarget}g protein · {carbs}g carbs.":
      "{kcal} van {target} kcal gepland ({pct}%) · {protein}/{proteinTarget}g proteïne · {carbs}g koolhydraten.",
    "{protein}g protein still open.": "Nog {protein}g proteïne open.",
    "Protein target is within reach.": "Je proteïnedoel is binnen bereik.",
  },
};
