# Camada adaptativa do coach — "um treinador que se adapta à sua vida"

Objetivo: tornar visível a promessa do produto. O coach passa a reagir a queda de
performance, inatividade, treino concluído, notas de série e perguntas durante o
treino — sempre com tom direto, humano, sem culpa e sem hype.

Regras desta entrega: mensagens base e detecções são **locais** (instantâneas,
funcionam offline); a IA entra só no chat e nas respostas de follow-up, sempre
via server function (chave fica no servidor). Cross-training pode ser registrado
por um sheet rápido **e** capturado pelo chat/notas. Você aplica o SQL no seu
Supabase, como nas rodadas anteriores.

## Fase A — base de dados + detecções principais

### 1. Migração SQL (você roda no SQL Editor)
Novo arquivo `scripts/supabase-migration-coaching.sql`, no padrão dos anteriores
(RLS por `auth.uid()`, grants para `authenticated` e `service_role`):

- `coaching_events` — cada evento adaptativo: tipo (`performance_drop`,
  `inactivity_checkin`, `post_workout`, `chat_swap`), exercício, causa inferida,
  mensagem mostrada, resposta do usuário, data.
- `cross_training_logs` — atividade não-musculação (corrida, esporte), data e nota.
- `coach_chat_messages` — histórico de chat por sessão (`role` user/coach).
- `workout_sets.coach_note text` — nota curta por série.

O app continua funcionando sem a migração: se as tabelas não existirem, as
detecções caem para armazenamento local e nada quebra.

### 2. Feature 1 — queda de performance com explicação de contexto
Nova lógica em `src/lib/coach/performance-drop.ts`:

- compara a série atual com a série mais recente do mesmo exercício **no mesmo peso**;
- se as reps caíram, busca contexto antes de falar: cross-training nas últimas
  24–48h, notas de energia/dor recentes, e se o padrão se repete em 3+ sessões;
- gera **uma** mensagem, escolhendo um caminho só:
  - causa externa provável → explicação tranquila ("Você correu ontem — isso
    custa força em empurrar. Como você está se sentindo?");
  - padrão repetido sem causa → nomeia platô e dá **uma** sugestão concreta
    (reduzir 5% ou brigar pela última rep, não as duas);
  - dip isolado → toque leve, sem drama.
- cada detecção é registrada em `coaching_events`, então o coach passa a
  referenciar padrões ao longo do tempo.

A mensagem aparece no card **Coach notes** da home e, durante a sessão, como
comentário do exercício.

### 3. Feature 3 — mensagem de recuperação pós-treino
Ao finalizar a sessão, `src/lib/coach/post-workout.ts` estima a intensidade
(volume, progressão de carga e duração vs. média recente do usuário) e gera uma
mensagem em duas partes:

- recuperação: sessão pesada → descanso/atividade leve; sessão leve → manter-se
  ativo (caminhada);
- nutrição: 2–3 alimentos concretos escolhidos pelos macros **ainda abertos** do
  dia (lidos dos dados de dieta), nunca repetindo o que já foi coberto;
- fecha com porta aberta ("Alguma dúvida?"), que abre o chat do coach.

### 4. Feature 6 — posição do comentário do coach
Na sessão de treino, o comentário/dica do coach passa a aparecer **acima** do
bloco do exercício (junto ao nome e ao descanso), para ser lido antes de começar,
não depois de terminar.

### 5. Registro de cross-training
Sheet rápido "Logged something else?" (corrida, futebol, bike, caminhada, outro +
data + nota), acessível da home e do Treino. Grava em `cross_training_logs` e
alimenta a detecção da Feature 1.

## Fase B — conversa, notas e chat na sessão

### 6. Feature 2 — inatividade e check-in proativo
Sem treino registrado por X dias (configurável no Perfil, padrão 3), o card
Coach notes mostra um check-in sem culpa ("Nada registrado há 4 dias. O que você
topa hoje?"). O usuário responde direto no card, em formato de chat: respostas
como "não estou com vontade de treinar inteiro" recebem uma proposta concreta —
sessão encurtada ou focada em um grupo — baseada nas rotinas e no histórico dele,
nunca um "volte aos trilhos" genérico. O mesmo campo fica sempre disponível, não
só quando o sistema detecta inatividade.

### 7. Feature 4 — "Note for coach" por série
Campo de texto curto e opcional **abaixo** de cada série já registrada (não
bloqueia o fluxo de log). Salvo em `workout_sets.coach_note` e enviado como
contexto na próxima geração de mensagem do coach ou ajuste de plano — a nota
visivelmente muda o que o coach diz depois.

### 8. Feature 5 — chat do coach dentro do treino
Ícone de chat junto do exercício atual. O usuário pergunta coisas como "não gosto
desse exercício por causa da lombar, tem alternativa?" ou "onde eu devo sentir?".
O coach responde em 2–3 frases e, quando faz sentido, propõe uma troca de
exercício (mesmo grupo muscular, respeitando a queixa) com um botão de aceitar
que atualiza a lista da sessão em andamento. A troca fica registrada como
`chat_swap` em `coaching_events` e o histórico em `coach_chat_messages`.

## Detalhes técnicos

- **Contexto enviado à IA** (só nas chamadas de chat/follow-up, via
  `createServerFn` em `src/lib/coach-ai.functions.ts` + prompt em
  `coach-ai.server.ts`, reaproveitando `src/lib/plan/gateway.server.ts`):
  últimas 5–10 séries do exercício relevante, cross-training dos últimos 3 dias,
  macros abertos do dia, notas de série ainda não usadas, e o nível de dedicação
  do onboarding (define quanto explicar). A chave nunca sai do servidor.
- **Camada de dados**: novas funções em `src/lib/data/coaching.ts` + server
  functions em `src/lib/forja.functions.ts`, seguindo o padrão atual
  (`db.server.ts`, escopo por `user_id`, fallback local quando a tabela falta).
- **Tipos**: `CoachingEvent`, `CrossTrainingLog`, `CoachChatMessage` em
  `src/lib/types.ts` e `src/lib/database.types.ts`.
- **UI**: `CoachNotesCard` ganha mensagens adaptativas + campo de resposta;
  `CoachChatSheet` ganha modo "em sessão" com troca de exercício; sessão recebe
  campo de nota por série e reposiciona o comentário do coach.
- **Tom e visual**: acento roxo único, cards/pílulas 16–24px, sem emoji, sem
  frases de culpa. Todas as strings novas entram no i18n (en/pt/nl).
- **Deduplicação**: no máximo uma mensagem adaptativa por gatilho por dia, para o
  card não virar ruído.
