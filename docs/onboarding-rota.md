# Onboarding — diagnóstico e proposta "sua rota começa aqui"

Investigação da jornada de entrada do Route (login → onboarding → home →
primeira sessão) feita em 2026-09-19, com referência ao código, e uma
proposta de redesenho que coloca a **rota** e o **logo R** no centro da
primeira experiência. Foco desta fase: introduzir a pessoa ao **treino**.

Contexto do código: o onboarding é `src/routes/_authenticated/onboarding.tsx`
(420 linhas, 8 estados), a rotina inicial vem de
`src/lib/import/starter-routine.ts`, as flags ficam em `src/lib/onboarding.ts`
(só `localStorage`). A rota vive em `src/lib/route/*`, `RoutePath.tsx` e
`rota.index.tsx`. O logo é um PNG (`RouteLogo.tsx`) e existe como vetor em
`src/components/completion/logo-paths.ts`, usado só na animação de fim de
exercício (`LogoRouteReveal.tsx`).

---

## Resumo em cinco linhas

1. O onboarding de hoje fala de painel, volume e recorde. A **rota** — a ideia
   que dá nome ao produto e à aba principal — não aparece nem uma vez.
2. Ele bifurca em três caminhos (Hevy, entrevista completa de ~25 campos,
   três perguntas rápidas) e nenhum deles termina com meta, prazo ou primeiro
   checkpoint. A pessoa chega numa home com nove blocos e a rota vazia.
3. A rotina sugerida cobre **um dia só** ("Upper A" para quem treina 4 dias),
   ignora o resto da semana e salva uma descrição técnica na tela da rotina.
4. O logo é um `<img>` de 351 KB; o R, duas linhas paralelas (roxa e branca)
   que percorrem o mesmo caminho, não é usado como linguagem visual.
5. Proposta: seis telas em menos de 90 segundos — **Partida → Destino → Ritmo
   → Primeiro trecho → Rota mapeada → Primeiro treino** — com o R se
   desenhando como barra de progresso e fechando na rota real da pessoa.

---

## 1. A jornada hoje, passo a passo

| #   | Tela                   | O que acontece                                                                                                                                                                                                                                     | Arquivo                                    |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 0   | Login `/`              | Foto de academia, tile do logo, "Strength, tracked", headline "An AI trainer that adapts to your actual life", abas Entrar / Criar conta, link mágico.                                                                                             | `routes/index.tsx`                         |
| 1   | Home `/inicio`         | Carrega perfil, rotinas, log, metas de dieta, checkpoints. Só depois que o log responde, se não houver treino finalizado e a flag local não existir, redireciona para o onboarding. A home chega a renderizar antes do redirect.                   | `routes/_authenticated/inicio.tsx:107-111` |
| 2   | Onboarding `value`     | Logo 40 px, "Seu treino, transformado em progresso visível", card com volume **fictício** (12.480 kg, +12 %), heatmap fixo e "Novo recorde: Supino reto 92,5 kg". Botão "Começar" e "Pular por agora".                                             | `onboarding.tsx:111-156`                   |
| 3   | Onboarding `fork`      | "Você já treina com outro app?" → card **Importar do Hevy**, card **"Set me up completely"** (marca onboarding concluído e vai para `/plano`), link pequeno "Just suggest a routine for now".                                                      | `onboarding.tsx:158-191`                   |
| 3a  | Entrevista `/plano`    | Pergunta de escopo (completo / só treino / só dieta) e depois 5 passos com ~25 campos (idade, sexo, altura, peso, meta em texto ou peso-alvo, prazo, tradução da meta por IA com switch de confirmação, equipamento, grade semanal, sono, etc.).   | `routes/_authenticated/plano.tsx`          |
| 3b  | Onboarding 3 perguntas | Objetivo (hipertrofia / força / condicionamento), dias (2-3 / 4 / 5+), experiência. Barra de progresso 45 → 65 → 85 %. Toque avança; não há "Voltar".                                                                                              | `onboarding.tsx:203-249`                   |
| 4   | Onboarding `building`  | 1,5 s de barras pulsando. Delay artificial: o plano já está calculado.                                                                                                                                                                             | `onboarding.tsx:67-71, 251-275`            |
| 5   | Onboarding `plan`      | Uma rotina de um dia com ícone de chama por exercício. "Usar esta rotina" salva e vai para a home; "Montar eu mesmo" vai para `/treino`.                                                                                                           | `onboarding.tsx:277-320`                   |
| 6   | Home dia 1             | Saudação genérica "Bom dia, Atleta", card de hoje, barra de peso, stats zerados, calendário vazio, card da rota vazio ("Map your route to your goal"), dieta 0 de 0 kcal, cross-training, checklist. No domingo/segunda, ainda o check-in semanal. | `inicio.tsx:131-227`                       |
| 7   | Primeira sessão        | Um coach mark: "Adjust weight and reps, then tap Complete set." Ao terminar um exercício com outro na fila, a animação card → check → rota → R.                                                                                                    | `sessao.tsx:399-410, 1738`                 |
| 8   | Aba Rota `/rota`       | Vazia: "Your route starts here" → botão "Set my goal date" → mapear. Só aqui a rota nasce, e só se a pessoa for atrás.                                                                                                                             | `rota.index.tsx:189-228`                   |

---

## 2. Diagnóstico: o que está custando caro

### A. A rota não existe no onboarding

A metáfora do produto (marca **Route**, aba **Rota**, `RoutePath`,
`LogoRouteReveal`, `RouteStatusLine` na home) só aparece depois que a pessoa
descobre a aba. O onboarding usa vocabulário de dashboard herdado do
"Iron Logger" (as chaves ainda se chamam `iron-logger-onboarding-done` e
`forja.sessionCoachMarks.v1`). Resultado: a pessoa sai sem meta, sem prazo e
sem checkpoint. Na home, `RouteStatusLine` retorna `null` (sem rota) e o
`RoutePreviewCard` fica no estado vazio.

### B. Três caminhos que não se reencontram

No `fork`, o card visualmente recomendado ("Set me up completely") é o caminho
mais pesado — a entrevista de `/plano` abre com **outra** pergunta de escopo e
segue por ~25 campos. O caminho leve (3 perguntas) está escondido num link de
12 px. O Hevy é nicho e ocupa o primeiro card. Não há um padrão claro, e cada
caminho termina num lugar diferente (`/plano`, `/inicio`, `/treino`).

### C. A rotina sugerida é de um dia e ignora as respostas

`buildStarterPlan` (`starter-routine.ts:16-50`) escolhe **um** blueprint por
frequência: "Full Body A" para 2-3 dias, "Upper A" para 4 (e o Lower?),
"Push A" para 5+ (e Pull / Legs?). O objetivo só muda séries, reps e
descanso; a experiência só soma ou tira uma série. A descrição gravada é
`goal:hypertrophy · frequency:4 · level:beginner`, que aparece na tela da
rotina. Os nomes do blueprint estão em inglês e, se não casarem com o
catálogo, o fallback são os seis primeiros exercícios da biblioteca.

Enquanto isso, `src/lib/routine-templates.ts` já tem PPL, Upper/Lower e
Full body 3x **com todos os dias e o dia da semana de cada um**. São duas
fontes de verdade para "rotina inicial" que não conversam.

### D. O que a rota precisa nunca é perguntado

O onboarding não pergunta nome (a home cai no fallback "Bom dia, Atleta"),
nem meta de corpo, nem prazo. São exatamente os
campos que `mapRoute` precisa (`metaPrazo`, `pesoMetaKg`, `pesoInicialKg`). A
frequência respondida (2-3 / 4 / 5+) não é gravada em `metaTreinosSemana`:
quem disse "2-3 dias" vê "0/4 sessões" na home.

### E. Prova de valor com dados falsos

12.480 kg, +12 %, heatmap fixo, "Supino reto 92,5 kg". Para quem escolhe
"Começando" isso é linguagem de planilha, e para quem já treina soa como
"isso é meu?". Não é a promessa do Route (partida → checkpoints → meta).

### F. Progresso que mente e espera que não existe

A barra vai de 45 % a 85 % e nunca fecha; não aparece nas telas de valor,
bifurcação e plano. O passo `building` espera 1,5 s por nada. A única espera
real da jornada (mapear a rota, que chama a IA) acontece **fora** do
onboarding, sem nenhuma animação.

### G. Não há uma "primeira ação"

"Usar esta rotina" → toast → home com nove blocos. Quem acabou de dizer
"quero treinar" precisa achar o botão "Start Upper A" no meio de dieta,
peso, calendário e checklist. `WeeklyCheckInCard` aparece no domingo/segunda
mesmo para quem nunca treinou (`checkInDue()` não olha o histórico), e
`WeekMenuPrompt` idem. Nada leva a pessoa até a primeira série.

### H. "Pular" sempre visível e leva para o vazio

`SkipLink` em todos os oito estados. Pular marca o onboarding como feito e
cai na home com "Create my routine". O único caminho de volta é Perfil →
"Rever onboarding", que é uma ferramenta de QA.

### I. Estado só em `localStorage`

Outro aparelho ou limpar o cache = onboarding de novo. `hasData` (tem treino
finalizado) evita isso só parcialmente: quem criou a rotina mas ainda não
treinou e troca de celular ganha uma segunda "Upper A". Não existe coluna de
onboarding no schema (`scripts/supabase-schema.sql`).

### J. Copy do login desalinhada com a marca

"Strength, tracked" e "An AI trainer that adapts to your actual life" não
falam de rota. `manifest.webmanifest` fixa `lang: en`. A detecção de idioma
funciona (pt-BR → pt), mas a primeira impressão da marca ainda é de tracker.

### K. Detalhes de UI

Sem botão "Voltar" em nenhum passo; opções sem estado selecionado; barra sem
`role="progressbar"`; ícone de chama (cor de dado de treino) usado como
bullet; transição por `fade` genérico; o logo é `<img>` PNG de 351 KB servido
do asset do Lovable, sem `currentColor`, sem possibilidade de animar.

---

## 3. Conceito: o onboarding é a primeira rota

O R do logo são **duas linhas paralelas**, a roxa por fora e a branca por
dentro, que saem da esquerda, curvam, voltam ao meio e descem juntas. É uma
rota, e a branca acompanha a roxa como quem segue o traçado. A proposta é
tratar o onboarding como o primeiro trajeto da pessoa e usar as duas linhas
do R como barra de progresso: cada resposta desenha um trecho (a branca um
passo atrás da roxa, como já faz o `LogoRouteReveal`), e na última tela o R
fecha e vira a rota real, com checkpoints e data.

Princípios:

- **Uma pergunta por tela, uma decisão por toque.** Toque avança (regra dos
  dois toques); "Voltar" no canto superior esquerdo; o R no canto superior
  direito mostra onde a pessoa está.
- **Tudo que é perguntado alimenta a rota.** Nome → saudação. Destino →
  `objetivo` + `metaPrazo`. Ritmo → `metaTreinosSemana` + dias das rotinas.
  Nada é perguntado por perguntar.
- **Termina em ação, não em home.** A última tela é "Começar o primeiro
  treino". O ciclo onboarding → sessão → primeiro checkpoint fecha no mesmo
  dia.
- **Padrão leve, profundidade depois.** A entrevista de `/plano` sai do
  primeiro minuto e é oferecida na home e na rota, já preenchida com o que a
  pessoa respondeu (o prefill pelo perfil já existe em `plano.tsx:116-128`).

---

## 4. Fluxo proposto, tela a tela

Layout comum (`OnboardingStep`): topo com "Voltar" à esquerda e o R em
progresso à direita (56 px); título de 2 linhas no máximo; opções como cards
de 56 px; botão primário fixo no rodapé (zona do polegar, como na sessão).
Transição entre telas: deslizar horizontal na direção da rota, respeitando
`prefers-reduced-motion` (padrão já existe em `styles.css`).

### Tela 0 — Login

- Tagline: **"Sua rota até o seu objetivo"** no lugar de "Strength, tracked".
- Headline: "Do ponto de partida ao objetivo, um treino de cada vez."
- O R se desenha uma vez ao abrir (o mesmo `RouteMarkProgress`, de 0 a 100 %
  em 900 ms). Foto de fundo pode ficar; o R animado passa a ser o foco.

### Tela 1 — Partida (10 % do traço)

```
 ←                                   [R ▁▁]
 Bem-vindo ao Route.
 Como podemos te chamar?
 ┌──────────────────────────────┐
 │ Seu nome                     │
 └──────────────────────────────┘
 Esse é o seu ponto de partida.

 [ Continuar ]
```

- Grava `profile.nome`. A home passa a saudar pelo nome.
- Substitui a tela de valor com números falsos. Se quiser manter uma prova de
  valor, ela vem na tela 5 com a rota **da própria pessoa**.

### Tela 2 — Destino (35 %)

```
 ←                                   [R ▂▂]
 Onde você quer chegar?
 ┌ Ganhar músculo      ┐ ┌ Ficar mais forte    ┐
 └─────────────────────┘ └─────────────────────┘
 ┌ Perder gordura      ┐ ┌ Voltar a treinar    ┐
 └─────────────────────┘ └─────────────────────┘

 Em quanto tempo?
 ( 8 semanas ) ( 12 semanas ) ( 16 semanas ) ( ainda não sei )
```

- Quatro destinos mapeiam para `Profile.objetivo` e `StarterGoal`
  (músculo → hipertrofia / bulking; forte → força; gordura → cutting +
  condicionamento; voltar → hipertrofia + experiência "começando").
- Prazo → `metaPrazo = hoje + N semanas`, `metaIniciadaEm = hoje`. Com 8
  semanas `checkpointDates` gera 4 checkpoints de 14 dias; com 12 ou 16,
  a cada 30 dias. "Ainda não sei" pula a data e a rota é oferecida na home.
- Este é o passo que hoje não existe e que faz a rota nascer.

### Tela 3 — Ritmo (60 %)

```
 ←                                   [R ▄▄]
 Em que dias você consegue treinar?
 ( S ) ( T ) ( Q ) ( Q ) ( S ) ( S ) ( D )
 3 dias por semana

 Você já treina?
 ( Estou começando ) ( Já treino há um tempo ) ( Avançado )
```

- Seletor de dias em vez de "2-3 / 4 / 5+": grava `metaTreinosSemana` e
  alimenta o `dia` de cada rotina (`ROUTINE_TEMPLATES` já suporta;
  `assignDays` em `weekly-checkin.ts` já distribui rotinas por dias).
- Experiência ajusta a prescrição (`prescriptionFor` mantém a lógica atual).

### Tela 4 — Primeiro trecho (85 %)

```
 ←                                   [R ▆▆]
 Seu primeiro trecho
 Upper / Lower · 4 dias

 Seg  Upper A   6 exercícios · ~45 min      ›
 Ter  Lower A   6 exercícios · ~40 min      ›
 Qui  Upper B   6 exercícios · ~45 min      ›
 Sex  Lower B   6 exercícios · ~40 min      ›

 [ Começar por aqui ]
 Montar eu mesmo · Importar do Hevy
```

- Substitui `buildStarterPlan` por `buildTemplateRoutines` + `prescriptionFor`:
  2-3 dias → Full body 3x; 4 → Upper/Lower; 5+ → PPL (dias distribuídos pelos
  escolhidos na tela 3). Nome e descrição humanos; nada de
  `goal:… · frequency:…`.
- Tocar numa linha abre o `ExerciseDetailSheet` da lista, sem sair do fluxo.
- Hevy e "Montar eu mesmo" viram links secundários aqui (e continuam no
  Perfil / Importar). Saem do primeiro card do onboarding.

### Tela 5 — Rota mapeada (100 %)

```
                                     [R ██]
 Sua rota está mapeada
 4 checkpoints até 14 nov

  ◉ Partida · hoje
  ○ Primeira sessão registrada · até 26 set
  ○ Primeiro progresso · 3 out
  ○ Manter o ritmo · 17 out
  ⚑ Meta alcançada · 14 nov

 [ Começar o primeiro treino ]
 Ver minha rota
```

- O R fecha o traçado com `LogoRouteReveal` (já existe) e dá lugar ao
  `RoutePath` (já existe) em versão compacta. Esta é a espera real — a
  chamada a `mapRoute(goalDate, lang)` — e é ela que a animação cobre. Se a
  IA falhar, `fallbackCheckpoints` já garante a rota.
- Checkpoint âncora "Primeira sessão registrada" (`metric: sessions = 1`,
  data hoje + 7) para a pessoa conquistar algo na semana 1;
  `evaluateCheckpoints` já avalia métricas de sessões.
- "Começar o primeiro treino" chama `startRoutineSession` da rotina do dia
  (ou a primeira) e abre `/sessao`. Onboarding concluído é gravado **no
  perfil**, não só no `localStorage`.

### Tela 6 — Primeira sessão e primeiro resumo

- Três coach marks em vez de um, cada um no momento certo: (1) na série
  atual, "Ajuste peso e reps e toque no ✓"; (2) após o primeiro ✓, "O
  descanso conta sozinho, você pode pular"; (3) ao fechar o primeiro
  exercício, a animação do R já existente.
- No `/resumo/$id` da primeira sessão: banner "Checkpoint 1 alcançado:
  primeira sessão" com o `RoutePreviewCard` e o primeiro nó aceso. O ciclo
  onboarding → sessão → rota fecha no mesmo dia.

---

## 5. O logo como sistema visual

Hoje o R é um PNG (`RouteLogo.tsx`) e um par de polígonos preenchidos
(`LOGO_PATH_OUTER` é a linha roxa, `LOGO_PATH_INNER` a branca) usados só no
morph. Proposta:

1. **`RouteMark`** — SVG inline com os dois paths existentes, `currentColor`,
   qualquer tamanho, zero download. Substitui todos os `<img>`
   (`__root.tsx`, `inicio.tsx`, `onboarding.tsx`, `index.tsx`). O PNG fica
   só para ícones do PWA e OG image.
2. **`RouteMarkProgress`** — as duas linhas do R em **traço** (dois paths de
   linha central, roxo e branco, `stroke-width` ≈ 78 no viewBox de 1254,
   pontas redondas) com `pathLength="100"` e
   `strokeDashoffset = 100 - progresso`; a branca fica um passo atrás da
   roxa. Um ponto na ponta da roxa (`getPointAtLength`) marca "você está
   aqui". É a barra de progresso do onboarding e a animação do login. As
   linhas completas ficam por baixo a 10 % de opacidade, então o progresso
   nunca "começa vazio" (o mesmo efeito de progresso dotado, mas honesto).
   `pathLength` só vale em `<path>`, não em `<use>`.
3. **`RouteMarkReveal`** — o `LogoRouteReveal` atual, com o alvo no centro da
   tela e sem depender de um card de origem, para a tela 5.
4. **`RoutePath` com trecho percorrido** — na aba Rota, a linha entre a
   partida e o checkpoint atual passa a ser sólida em roxo (`primary`); dali
   em diante continua tracejada em `border`. A mesma linguagem do R: a parte
   desenhada é o que já foi percorrido.

Cores seguem a regra do `styles.css`: roxo = marca e ação (o traço da rota),
verde = conquistado (nó de checkpoint alcançado), laranja só para números de
treino. Sem chama nos bullets da rotina sugerida.

---

## 6. Home no dia 1

Para quem ainda não tem treino finalizado, a ordem e a visibilidade mudam:

1. `TodayCard` com "Começar Upper A" no topo.
2. `RoutePreviewCard` logo abaixo, com o checkpoint "Primeira sessão".
3. Checklist renomeada para **"Primeiro trecho"**: Conta ✓ · Rota mapeada ✓ ·
   Primeiro treino · Primeiro checkpoint (ligada à rota, não a "First PR").
4. Escondidos até a primeira sessão: `StatsRow`, `WorkoutCalendar`,
   `DietCard`, `CrossTrainingSheet`, `WeightQuickLogBar` (a menos que a
   pessoa tenha dito "perder gordura", aí a barra de peso entra como
   "registre seu peso de partida" e grava `pesoInicialKg`).
5. `WeeklyCheckInCard` e `WeekMenuPrompt` passam a exigir pelo menos um
   treino finalizado.
6. O card "Quer que eu monte treino e dieta em volta da sua semana? Leva 5
   min" (`GetAPlanCard`, hoje só no Perfil) entra na home **depois** da
   primeira sessão, com a entrevista já preenchida.

---

## 7. Mudanças de dados e código

| Onde                                       | O que muda                                                                                                                                                                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/supabase-migration-*.sql`         | Coluna `onboarding_concluido_em` em `profiles`. `Profile.onboardingConcluidoEm?: string` em `types.ts`.                                                                                                                                         |
| `src/lib/onboarding.ts`                    | `onboardingDone()` lê o perfil (fallback `localStorage` enquanto a coluna não existir, mesmo padrão do `GOAL_KEY` em `data/profile.ts`). Renomear chaves `iron-logger-*` / `forja.*` para `route.*`.                                            |
| `src/lib/import/starter-routine.ts`        | Apagar `BLUEPRINTS`; `buildStarterPlan` passa a compor `ROUTINE_TEMPLATES` + `prescriptionFor` + dias escolhidos. Manter `StarterAnswers` com `days: number[]` em vez de `frequency`.                                                           |
| `src/routes/_authenticated/onboarding.tsx` | Reescrever em cima de `OnboardingStep` com os 6 estados: `start`, `destination`, `rhythm`, `routine`, `route`, e o handoff para `/sessao`. Sem `value`, `fork`, `building`. Salvar perfil (nome, objetivo, prazo, dias) antes de mapear a rota. |
| `src/components/RouteMark.tsx` (novo)      | `RouteMark`, `RouteMarkProgress`; `logo-paths.ts` ganha `LOGO_CENTERLINE`.                                                                                                                                                                      |
| `src/components/RoutePath.tsx`             | Segundo `<path>` com o trecho percorrido (`strokeDasharray` calculado até o nó atual).                                                                                                                                                          |
| `src/routes/_authenticated/inicio.tsx`     | Redirecionar antes de renderizar (usar `beforeLoad` com o perfil, ou um estado `checking`). Ordem/visibilidade do dia 1 (seção 6).                                                                                                              |
| `src/routes/_authenticated/sessao.tsx`     | Coach marks 2 e 3 (chave única `route.sessionCoachMarks.v2` com etapa).                                                                                                                                                                         |
| `src/routes/_authenticated/resumo.$id.tsx` | Banner de checkpoint alcançado quando `evaluateCheckpoints` mudar um status nesta sessão.                                                                                                                                                       |
| `src/lib/i18n/dict/onboarding.ts`          | Novas chaves pt/nl; remover as da tela de valor e do fork.                                                                                                                                                                                      |
| `routes/index.tsx`, `dict/pwa.ts`          | Tagline e headline novas; `manifest.webmanifest` sem `lang` fixo em `en` ou gerado por idioma.                                                                                                                                                  |

Nada muda em `session-state.ts`, `complete-set.ts`, `RestIsland`,
`mapRoute` ou nos server functions de IA.

---

## 8. O que medir

Funil, registrado via `logCoachingEvent` (já existe) ou pelo analytics do
Lovable, por passo:

login → partida → destino → ritmo → primeiro trecho → rota mapeada →
primeira sessão iniciada → primeira sessão finalizada → checkpoint 1.

Metas iniciais: 60 % das contas novas chegam à tela "Rota mapeada"; 40 %
iniciam a primeira sessão no mesmo dia; 25 % finalizam. Comparar com a taxa
atual de "tem treino finalizado em 7 dias", que hoje dá para tirar do
`workouts` no Supabase.

---

## 9. Ordem de execução

### Fase 1 — ganhos rápidos (1 a 2 dias, sem tocar em schema)

**Feita em 2026-09-20.** O onboarding passou a ser nome → destino → dias →
experiência → primeiro trecho (`onboarding.tsx`); a rotina inicial vem dos
templates com um dia por rotina (`starter-routine.ts`); nome, objetivo e
meta semanal vão para o perfil; a home só mostra check-in semanal e cardápio
depois do primeiro treino e a checklist virou "Primeiro trecho".

- Remover a tela de valor com dados falsos e o `building` de 1,5 s.
- Rotina inicial completa via `ROUTINE_TEMPLATES`; descrição humana.
- Perguntar o nome; gravar `metaTreinosSemana` e `objetivo` no perfil.
- "Pular" só nas telas de destino e ritmo, e leva para a rotina, nunca para a
  home vazia.
- Hevy e "Montar eu mesmo" viram links secundários na tela da rotina.
- Home dia 1: `WeeklyCheckInCard` e `WeekMenuPrompt` só com treino
  finalizado; checklist "Primeiro trecho".

### Fase 2 — a rota entra no onboarding (3 a 5 dias)

- Telas Destino (meta + prazo) e Rota mapeada (`mapRoute` + `RoutePath` +
  "Começar o primeiro treino").
- Checkpoint âncora "Primeira sessão registrada".
- Coluna `onboarding_concluido_em`; `onboardingDone()` pelo perfil; redirect
  antes do primeiro render da home.
- Banner de checkpoint no resumo; coach marks 2 e 3 na sessão.

### Fase 3 — o logo como sistema (3 a 5 dias)

- `RouteMark` SVG substitui o PNG em todos os pontos; `RouteMarkProgress` no
  onboarding e no login.
- `RoutePath` com trecho percorrido em roxo.
- Transição horizontal entre passos; `OnboardingStep` compartilhado com
  "Voltar" e `role="progressbar"`.
- Tagline e headline do login; manifest.

### Aceite

- Conta nova, celular 375×667: do login à primeira série em menos de 90 s e
  no máximo 8 toques (nome, destino, prazo, 3 dias, experiência, "Começar
  por aqui", "Começar o primeiro treino").
- Ao fim do onboarding: perfil com nome, objetivo, `metaPrazo`,
  `metaTreinosSemana`; N rotinas com `dia`; ≥ 2 checkpoints; home mostrando
  "Na sua rota" na `RouteStatusLine`.
- Trocar de aparelho não repete o onboarding nem duplica rotinas.
- Reduced motion: nenhum traçado animado, o R aparece completo.
- `bun run lint` e `bun run build` limpos; strings pt e nl presentes.
