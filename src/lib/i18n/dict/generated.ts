import type { DictFragment } from "../types";

/**
 * Copy that is assembled in the data layer (progression rule, coach engine,
 * Claude bridge) instead of a component. Keys are the English source strings
 * passed to `tx()` from `@/lib/format`.
 */
export const dict: DictFragment = {
  pt: {
    // ── progression.ts
    "Last session: {sets}x{reps}.": "Última sessão: {sets}x{reps}.",
    "Last session: {sets}x{reps} @ {rpe} RPE.": "Última sessão: {sets}x{reps} @ {rpe} PSE.",
    "{summary} Suggested +{inc} kg.": "{summary} Sugerido +{inc} kg.",
    "{summary} High RPE — hold {weight} kg.": "{summary} PSE alto — mantenha {weight} kg.",
    "{summary} Target range is {min}-{max} reps — hold {weight} kg.":
      "{summary} A faixa alvo é {min}-{max} reps — mantenha {weight} kg.",

    // ── claude-import.ts
    'Unknown exercise "{id}" — it will be skipped.':
      'Exercício desconhecido "{id}" — será ignorado.',
    "{n}. (unknown exercise)": "{n}. (exercício desconhecido)",
    "Routine · {name}": "Rotina · {name}",
    'Unknown meal "{id}" on {date} — it will be skipped.':
      'Refeição desconhecida "{id}" em {date} — será ignorada.',
    "{slot}: (unknown)": "{slot}: (desconhecida)",
    "Diet plan · {n} day(s)": "Plano alimentar · {n} dia(s)",
    "Coach note · {kind}": "Nota do coach · {kind}",
    "Tags: {tags}": "Tags: {tags}",
    'Added routine "{name}" with {n} exercises.':
      'Rotina "{name}" adicionada com {n} exercícios.',
    "Planned {n} meal(s) across {days} day(s).":
      "{n} refeição(ões) planejada(s) em {days} dia(s).",
    "Coach note saved — your coach will reference it on Train.":
      "Nota salva — seu coach vai usá-la na tela de Treino.",

    // ── claude-bridge.ts
    "No Forja code found. It should start with {prefix}":
      "Nenhum código encontrado. Ele deve começar com {prefix}",
    "That code is damaged — copy the whole code from Claude again.":
      "Esse código está corrompido — copie o código inteiro do Claude novamente.",
    "Unsupported code contents.": "Conteúdo do código não suportado.",

    // ── coach/chat.ts
    "{title}. {reason}": "{title}. {reason}",
    "Stalled lifts: {lifts}. Push for reps or consider a small load jump if form is clean.":
      "Exercícios estagnados: {lifts}. Busque mais repetições ou um pequeno aumento de carga se a execução estiver limpa.",
    "No stalled lifts detected right now. Keep hitting your rep ranges before adding load.":
      "Nenhum exercício estagnado agora. Continue batendo a faixa de repetições antes de aumentar a carga.",
    "Rest long enough to hit the next set with quality. Compound lifts usually need 90–180s; isolation moves 60–90s. If your RPE is climbing, add 15–30s.":
      "Descanse o suficiente para fazer a próxima série com qualidade. Exercícios compostos pedem 90–180s; isoladores 60–90s. Se o PSE estiver subindo, adicione 15–30s.",
    "Nutrition notes will get sharper once meal logging ships.":
      "As notas de nutrição vão ficar mais precisas quando o registro de refeições evoluir.",
    "I can’t reason about that yet. Ask me what to train today, what’s stalled, or about recovery and nutrition.":
      "Ainda não sei responder isso. Pergunte o que treinar hoje, o que está estagnado, ou sobre recuperação e nutrição.",

    // ── coach/recommendations.ts
    "Start a blank workout": "Começar treino livre",
    "No routines yet": "Nenhuma rotina ainda",
    "Build a routine first, or log exercises as you go.":
      "Crie uma rotina primeiro, ou registre exercícios conforme treina.",
    "{name} was last trained {days} days ago and its main muscle groups are fresh this week.":
      "{name} foi treinado há {days} dias e os principais grupos musculares estão descansados esta semana.",
    "{name} is a good place to start — it hits the biggest movement patterns.":
      "{name} é um bom ponto de partida — cobre os maiores padrões de movimento.",
    "Take the check-in soreness into account and reduce intensity if needed.":
      "Considere a dor que você registrou no check-in e reduza a intensidade se precisar.",
    "Train {name}": "Treinar {name}",
    "{n} exercises · {min} min target": "{n} exercícios · meta de {min} min",
    "Weekly target": "Meta semanal",
    "You’re at {done} of {goal} sessions this week. A short session still counts if time is tight.":
      "Você está em {done} de {goal} treinos esta semana. Um treino curto também conta se o tempo apertar.",
    "Volume dropped": "Volume caiu",
    "This week’s volume is down from last week. Check recovery, sleep, or stress before pushing harder.":
      "O volume desta semana caiu em relação à anterior. Cheque recuperação, sono e estresse antes de forçar mais.",
    "Fatigue is climbing": "A fadiga está subindo",
    "Your average difficulty is rising while performance is flat. A lighter or deload session next time could help.":
      "Sua dificuldade média está subindo com o desempenho estável. Um treino mais leve ou um deload pode ajudar.",
    "Adjusting to your feedback": "Ajustando ao seu feedback",
    "Stalled": "Estagnado",
    "Same weight for three sessions running — aim for an extra rep or add load if form is clean.":
      "Mesmo peso por três sessões seguidas — busque uma repetição extra ou aumente a carga se a execução estiver limpa.",

    // ── session-state / start-session
    "Free workout": "Treino livre",
    "Blank workout": "Treino livre",

    // ── Claude section (Profile)
    "Claude / AI assistant": "Claude / assistente de IA",
    "Connect Forja to your own Claude chat, ask it for a routine or a week of meals, then import the code it gives you back.":
      "Conecte o app ao seu próprio chat do Claude, peça uma rotina ou uma semana de refeições e importe o código que ele devolver.",
    "1 · Connector URL": "1 · URL do conector",
    "In Claude: Settings → Connectors → Add custom connector, and paste this URL.":
      "No Claude: Configurações → Conectores → Adicionar conector personalizado e cole esta URL.",
    "Copy URL": "Copiar URL",
    "Connector URL": "URL do conector",
    "2 · Your training context": "2 · Seu contexto de treino",
    "Paste this into the Claude chat first so it plans with your equipment, limits and recent sessions.":
      "Cole isto primeiro no chat do Claude para que ele planeje com seus equipamentos, limites e treinos recentes.",
    "Copy my training context": "Copiar meu contexto de treino",
    "Training context": "Contexto de treino",
    "3 · Import from Claude": "3 · Importar do Claude",
    "Paste the FORJA1. code Claude returned…": "Cole o código FORJA1. que o Claude devolveu…",
    "Preview import": "Pré-visualizar importação",
    "Apply": "Aplicar",
    "{label} copied": "{label} copiado",
    "Could not copy — select the text manually.":
      "Não foi possível copiar — selecione o texto manualmente.",
    "Import failed — check the code and try again.":
      "A importação falhou — confira o código e tente de novo.",
    "mornings": "manhãs",
    "middays": "meio-dia",
    "afternoons": "tardes",
    "evenings": "noites",
  },
  nl: {
    // ── progression.ts
    "Last session: {sets}x{reps}.": "Vorige sessie: {sets}x{reps}.",
    "Last session: {sets}x{reps} @ {rpe} RPE.": "Vorige sessie: {sets}x{reps} @ {rpe} RPE.",
    "{summary} Suggested +{inc} kg.": "{summary} Voorstel +{inc} kg.",
    "{summary} High RPE — hold {weight} kg.": "{summary} Hoge RPE — hou {weight} kg aan.",
    "{summary} Target range is {min}-{max} reps — hold {weight} kg.":
      "{summary} Het doelbereik is {min}-{max} reps — hou {weight} kg aan.",

    // ── claude-import.ts
    'Unknown exercise "{id}" — it will be skipped.':
      'Onbekende oefening "{id}" — deze wordt overgeslagen.',
    "{n}. (unknown exercise)": "{n}. (onbekende oefening)",
    "Routine · {name}": "Routine · {name}",
    'Unknown meal "{id}" on {date} — it will be skipped.':
      'Onbekende maaltijd "{id}" op {date} — deze wordt overgeslagen.',
    "{slot}: (unknown)": "{slot}: (onbekend)",
    "Diet plan · {n} day(s)": "Voedingsplan · {n} dag(en)",
    "Coach note · {kind}": "Coachnotitie · {kind}",
    "Tags: {tags}": "Tags: {tags}",
    'Added routine "{name}" with {n} exercises.':
      'Routine "{name}" toegevoegd met {n} oefeningen.',
    "Planned {n} meal(s) across {days} day(s).":
      "{n} maaltijd(en) gepland over {days} dag(en).",
    "Coach note saved — your coach will reference it on Train.":
      "Notitie opgeslagen — je coach gebruikt die op het Trainen-scherm.",

    // ── claude-bridge.ts
    "No Forja code found. It should start with {prefix}":
      "Geen code gevonden. Die moet beginnen met {prefix}",
    "That code is damaged — copy the whole code from Claude again.":
      "Die code is beschadigd — kopieer de volledige code opnieuw uit Claude.",
    "Unsupported code contents.": "Inhoud van de code wordt niet ondersteund.",

    // ── coach/chat.ts
    "{title}. {reason}": "{title}. {reason}",
    "Stalled lifts: {lifts}. Push for reps or consider a small load jump if form is clean.":
      "Stagnerende oefeningen: {lifts}. Ga voor extra reps of een kleine gewichtssprong als je techniek klopt.",
    "No stalled lifts detected right now. Keep hitting your rep ranges before adding load.":
      "Nu geen stagnerende oefeningen. Haal eerst je repbereik voordat je gewicht toevoegt.",
    "Rest long enough to hit the next set with quality. Compound lifts usually need 90–180s; isolation moves 60–90s. If your RPE is climbing, add 15–30s.":
      "Rust lang genoeg om de volgende set met kwaliteit te doen. Compound-oefeningen vragen 90–180s; isolatie 60–90s. Stijgt je RPE, tel er 15–30s bij op.",
    "Nutrition notes will get sharper once meal logging ships.":
      "Voedingsnotities worden scherper zodra maaltijdregistratie uitgebreid is.",
    "I can’t reason about that yet. Ask me what to train today, what’s stalled, or about recovery and nutrition.":
      "Daar kan ik nog niet over meedenken. Vraag me wat je vandaag moet trainen, wat stagneert, of over herstel en voeding.",

    // ── coach/recommendations.ts
    "Start a blank workout": "Start een vrije training",
    "No routines yet": "Nog geen routines",
    "Build a routine first, or log exercises as you go.":
      "Maak eerst een routine, of log oefeningen terwijl je traint.",
    "{name} was last trained {days} days ago and its main muscle groups are fresh this week.":
      "{name} deed je {days} dagen geleden voor het laatst en de belangrijkste spiergroepen zijn deze week fris.",
    "{name} is a good place to start — it hits the biggest movement patterns.":
      "{name} is een goed startpunt — het dekt de grootste bewegingspatronen.",
    "Take the check-in soreness into account and reduce intensity if needed.":
      "Houd rekening met de spierpijn uit je check-in en verlaag de intensiteit als dat nodig is.",
    "Train {name}": "Train {name}",
    "{n} exercises · {min} min target": "{n} oefeningen · doel {min} min",
    "Weekly target": "Weekdoel",
    "You’re at {done} of {goal} sessions this week. A short session still counts if time is tight.":
      "Je staat op {done} van {goal} sessies deze week. Een korte sessie telt ook als je weinig tijd hebt.",
    "Volume dropped": "Volume gedaald",
    "This week’s volume is down from last week. Check recovery, sleep, or stress before pushing harder.":
      "Het volume van deze week ligt lager dan vorige week. Check herstel, slaap en stress voordat je harder gaat.",
    "Fatigue is climbing": "Vermoeidheid loopt op",
    "Your average difficulty is rising while performance is flat. A lighter or deload session next time could help.":
      "Je gemiddelde zwaarte stijgt terwijl je prestatie vlak blijft. Een lichtere sessie of deload kan helpen.",
    "Adjusting to your feedback": "Aangepast aan jouw feedback",
    "Stalled": "Stagneert",
    "Same weight for three sessions running — aim for an extra rep or add load if form is clean.":
      "Drie sessies achter elkaar hetzelfde gewicht — ga voor een extra rep of meer gewicht als je techniek klopt.",

    // ── session-state / start-session
    "Free workout": "Vrije training",
    "Blank workout": "Vrije training",

    // ── Claude section (Profile)
    "Claude / AI assistant": "Claude / AI-assistent",
    "Connect Forja to your own Claude chat, ask it for a routine or a week of meals, then import the code it gives you back.":
      "Verbind de app met je eigen Claude-chat, vraag om een routine of een week maaltijden en importeer de code die je terugkrijgt.",
    "1 · Connector URL": "1 · Connector-URL",
    "In Claude: Settings → Connectors → Add custom connector, and paste this URL.":
      "In Claude: Instellingen → Connectors → Aangepaste connector toevoegen en plak deze URL.",
    "Copy URL": "URL kopiëren",
    "Connector URL": "Connector-URL",
    "2 · Your training context": "2 · Jouw trainingscontext",
    "Paste this into the Claude chat first so it plans with your equipment, limits and recent sessions.":
      "Plak dit eerst in de Claude-chat, zodat er wordt gepland met jouw materiaal, grenzen en recente sessies.",
    "Copy my training context": "Mijn trainingscontext kopiëren",
    "Training context": "Trainingscontext",
    "3 · Import from Claude": "3 · Importeren uit Claude",
    "Paste the FORJA1. code Claude returned…": "Plak de FORJA1.-code die Claude gaf…",
    "Preview import": "Import bekijken",
    "Apply": "Toepassen",
    "{label} copied": "{label} gekopieerd",
    "Could not copy — select the text manually.":
      "Kopiëren lukte niet — selecteer de tekst handmatig.",
    "Import failed — check the code and try again.":
      "Importeren mislukt — controleer de code en probeer opnieuw.",
    "mornings": "ochtenden",
    "middays": "middagen",
    "afternoons": "namiddagen",
    "evenings": "avonden",
  },
};
