# Pastas de treino: um programa atual, padrões em destaque, variações guardadas

Hoje as rotinas ficam numa lista solta ("My routines" em Treino) e o histórico em Progresso é uma lista corrida de sessões. Nada diz "este é o meu programa atual". Quando um exercício é trocado (pelo Coach antes de começar ou pelo "Replace exercise" no meio da sessão), a troca vale só para aquela sessão e **não é registrada**. Na sessão salva sobra o exercício novo, sem nenhum vínculo com o que ele substituiu nem com o motivo.

Este plano cria a **Pasta de treino**, que agrupa as rotinas e as sessões de um período. Em cada pasta:

- uma pasta fica marcada como **atual**: é o programa que você está seguindo agora;
- as rotinas **padrão** (Treino A, B, C…) aparecem em destaque;
- as **variações** (treino com amigos, pouco tempo, dor, aparelho ocupado) também ficam guardadas na pasta, só que com menos destaque. Cada uma mostra o motivo e o grupo muscular do exercício trocado;
- ao fim do ciclo, a pasta vira um **modelo**. O modelo guarda as cargas e as mudanças que se firmaram, e dele sai a próxima pasta.

---

## 1. Conceito e vocabulário

| Termo na UI (pt / en / nl) | O que é |
|---|---|
| **Pasta** / Folder / Map | Agrupa rotinas + sessões de um período (um bloco/ciclo de treino). |
| **Atual** / Current / Huidig | A única pasta ativa. Treino abre nela, e rotinas e sessões novas entram nela. |
| **Padrão** / Standard / Standaard | Rotina principal da pasta (A/B/C). Aparece em destaque. |
| **Variação** / Variation / Variant | Uma sessão que fugiu do padrão (troca de exercício, versão curta, treino social). Fica visível, só que com menos destaque. |
| **Modelo** / Template / Sjabloon | Pasta encerrada, usada para começar a próxima pasta. Continua editável. |

Motivos da variação, que viram chips (reaproveitando e ampliando o `SwapReason` de `src/lib/coach/swap.ts`):
`busy` (pouco tempo) · `social` (treino com amigos) · `pain` (dor/desconforto) · `equipment` (aparelho ocupado/indisponível) · `preference` (preferência) · `difficulty` (difícil demais).

---

## 2. Modelo de dados

Arquivo novo: `scripts/supabase-migration-folders.sql`. Não há framework de migração, então o usuário aplica esse arquivo manualmente. O código segue o mesmo padrão de fallback já usado com `dias_semana`: se a coluna ou tabela não existe, o app continua funcionando no modo antigo.

```sql
create table if not exists public.training_folders (
  id text primary key,
  user_id text not null,
  nome text not null,
  status text not null default 'atual',   -- 'atual' | 'arquivada' | 'modelo'
  origem_modelo_id text references public.training_folders (id) on delete set null,
  inicio_em timestamptz not null default now(),
  fim_em timestamptz,
  created_at timestamptz not null default now()
);
-- no máximo uma pasta atual por usuário
create unique index if not exists training_folders_one_current
  on public.training_folders (user_id) where status = 'atual';

alter table public.routines
  add column if not exists folder_id text references public.training_folders (id) on delete set null,
  add column if not exists papel text not null default 'padrao',          -- 'padrao' | 'variacao'
  add column if not exists variacao_de text references public.routines (id) on delete set null,
  add column if not exists motivo text;                                     -- SwapReason

alter table public.workouts
  add column if not exists folder_id text references public.training_folders (id) on delete set null,
  add column if not exists variacao boolean not null default false,
  add column if not exists motivo text;

alter table public.workout_sets
  add column if not exists substitui_exercise_id text;  -- exercício padrão que este substituiu
```

Decisões de modelagem:

- **`workouts.folder_id` é um snapshot.** Se a rotina mudar de pasta depois, a sessão continua na pasta em que foi feita.
- **O grupo muscular da troca não fica gravado.** Ele sai de `exercises.grupoPrimario` do `substitui_exercise_id`, então "Supino → Crucifixo" aparece como *Peito* sem duplicar dado.
- **Uma variação pode ser duas coisas:** uma **sessão marcada** (`workouts.variacao = true`), que é o caso comum e pontual, ou uma **rotina variação** salva (`routines.papel = 'variacao'`, `variacao_de = <rotina padrão>`), como "Treino A — versão 40 min" para reusar depois.
- **Backfill automático:** no primeiro carregamento sem pastas, o data layer cria "Meu treino" (status `atual`), move para ela todas as rotinas existentes e marca `folder_id` nos workouts delas. Treinos em branco ficam na pasta atual como variação sem motivo.

Tipos em `src/lib/types.ts`:
- `TrainingFolder`;
- `Routine` ganha `folderId?`, `papel?`, `variacaoDe?`, `motivo?`;
- `Workout` ganha `folderId?`, `variacao?`, `motivo?`;
- `WorkoutSet` ganha `substituiExerciseId?`;
- `SwapReason` passa a incluir `social` e `equipment`.

Server functions em `src/lib/forja.functions.ts`: `fetchFolders`, `persistFolder`, `closeFolder`, `startFolderFromTemplate`, além de ajustes em `fetchRoutines`/`persistRoutine`/`persistWorkout`/`fetchWorkoutLog` para ler e gravar as colunas novas, com fallback.

Data layer novo, `src/lib/data/folders.ts` (componentes só importam daqui):
`getFolders()`, `getCurrentFolder()`, `getFolder(id)`, `createFolder(nome)`, `setCurrentFolder(id)`, `renameFolder`, `moveRoutineToFolder`, `closeFolderAsTemplate(id, opts)`, `startFromTemplate(templateId, nome)`, `getFolderSummary(id)` (sessões, padrões x variações, trocas por grupo muscular).

---

## 3. Registrar as trocas (a base de tudo)

Sem isso, a pasta não tem como separar padrão de variação.

1. **`ActiveExercise`** (`src/lib/session-state.ts`) ganha `substituiDe?: string` e `motivoTroca?: SwapReason`.
2. **Troca antes de começar** (TodayCoachCard → `startRoutineSession({ swaps })` em `src/lib/start-session.ts`): quando `swaps[rex.exerciseId]` é aplicado, o exercício construído recebe `substituiDe = rex.exerciseId`.
3. **Troca no meio da sessão** (`swapExerciseTo` e o fluxo "Replace exercise" em `sessao.tsx`): grava `substituiDe` com o exercício original. Se o original já era uma substituição, mantém o `substituiDe` de origem para não virar cadeia; trocar de volta para o original apaga a marca.
   O motivo é perguntado **uma vez, no fim da sessão** (ver abaixo), e não em cada troca, para não interromper o treino.
4. **Sessão curta / deload / treino social iniciado de fora da rotina:** o botão "Start lighter" e um novo "Treino com amigos / pouco tempo" no card da rotina abrem a sessão já marcada como variação com o motivo certo.
5. **Ao salvar (finish em `sessao.tsx`):** cada set leva `substituiExerciseId`; o workout leva `folderId` (pasta atual), `variacao` (há troca, motivo, deload ou rotina variação) e `motivo` (o mais frequente da sessão). A fila offline (`enqueueWorkout`) carrega os mesmos campos.

### Diálogo no fim da sessão (só quando houve troca)

Um passo curto dentro do diálogo de finalização que já existe, sem modal novo:

> **Você trocou 2 exercícios hoje** (Supino → Crucifixo · Peito, Agachamento → Leg press · Quadríceps)
> - **Foi só hoje**: salva como variação (padrão)
> - **Guardar como variação da rotina**: cria "Treino A — {motivo}" dentro da pasta, com menos destaque
> - **Atualizar o padrão**: aplica as trocas na rotina padrão

Um toque resolve. Se o usuário não escolher nada, vale "foi só hoje".

---

## 4. Tela Treino: a pasta atual

A seção "My routines" de `src/routes/_authenticated/treino.tsx` vira a **pasta atual**:

1. **Cabeçalho da pasta:** nome ("Hipertrofia · Set–Out"), "semana 3 · 11 sessões" e um seletor (chevron) que abre o sheet **Minhas pastas**.
2. **Padrões** (destaque total): os `RoutineCard` de hoje, sem mudança visual, incluindo "Recommended today", coach flags e expandir/recolher.
3. **Variações** (menos destaque): uma seção recolhida por padrão, "Variações (3)", com cards mais baixos, borda tracejada, texto `muted-foreground` e sem capa. Cada card mostra:
   - nome ou data ("Treino A — pouco tempo", "Qui 18/09");
   - chip de motivo (⏱ pouco tempo, 👥 amigos, 🩹 dor, 🏋 aparelho ocupado);
   - chips de grupo muscular da troca ("↻ Peito", "↻ Quadríceps");
   - ações: "Repetir esta variação" e "Promover a padrão".
4. **Criar rotina / Start from a template** passam a criar dentro da pasta atual.

**Sheet "Minhas pastas":**
- Atual (1), Arquivadas, Modelos;
- "Nova pasta", que pode começar vazia, de um modelo ou copiando a atual;
- "Tornar atual" em qualquer pasta arquivada.

---

## 5. Detalhe da pasta: rota `/_authenticated/pasta.$id.tsx`

- **Resumo:** período, número de sessões (padrão x variação), volume, aderência às rotinas padrão.
- **Padrões:** lista das rotinas com a última execução de cada uma.
- **Variações:** mesma hierarquia visual da tela Treino (menor, tracejada).
- **"O que mais foi trocado":** trocas agrupadas por **grupo muscular**, por exemplo "Peito: Supino → Crucifixo (4×, pouco tempo)" e "Quadríceps: Agachamento → Leg press (2×, aparelho ocupado)". É o insight que alimenta o modelo (seção 7).
- **Sessões da pasta:** mesmo card do histórico de Progresso, filtrado pela pasta.
- **Ações:** renomear, encerrar ciclo / virar modelo, começar nova pasta a partir desta.

---

## 6. Progresso: histórico agrupado por pasta

Em `src/components/progress/ProgressView.tsx`:

- a lista "History" passa a ser agrupada por pasta. A pasta atual vem aberta no topo e as anteriores ficam recolhidas, cada uma com um link para o detalhe;
- o filtro de chips "All routines / rotina X" ganha um nível acima: **Pasta** (Atual, anteriores, Todas);
- a **sessão padrão** mantém o card de hoje;
- a **sessão variação** usa um card mais compacto e com menos contraste, badge "Variação · pouco tempo" e o chip de troca "↻ Peito";
- o detalhe da sessão (`progresso.$id.tsx`) e o resumo (`resumo.$id.tsx`) mostram, em cada exercício substituído, a linha "no lugar de **Supino reto** (Peito)".

---

## 7. Encerrar ciclo → modelo atualizado

Ação "Encerrar ciclo" na pasta atual, com um assistente curto de três passos:

1. **Revisar trocas recorrentes.** Para cada troca que aconteceu em ≥50% das sessões da rotina (ex.: Crucifixo no lugar de Supino em 4 de 6), pergunta: "Incluir no modelo?" (sim/não por troca).
2. **Atualizar prescrição.** O modelo copia as rotinas padrão com séries e reps atuais e grava, nas `notas` de cada exercício, a carga de referência do fim do ciclo (último set válido ou prescrição de `prescribeExercise`). Assim a próxima pasta já começa com as cargas certas.
3. **Resultado.** A pasta vira `modelo` (rotinas continuam editáveis, sessões preservadas). O app oferece **"Começar nova pasta a partir deste modelo"**, que duplica as rotinas padrão com ids novos numa pasta `atual` chamada "{nome} · ciclo 2", ligada por `origem_modelo_id`. Por padrão, as rotinas variação **não** são copiadas; há um checkbox para levá-las.

Encerrar sem transformar em modelo também é possível: nesse caso a pasta vira `arquivada`.

---

## 8. Coach, MCP e Claude bridge

- **Coach** (`src/lib/coach/*`): `recommendations`/`today-card` passam a considerar só as rotinas **padrão da pasta atual** para "Recommended today". Variações não entram no rodízio. O `swap.ts` usa o histórico de trocas da pasta para ranquear: um substituto já usado sobe na lista.
- **MCP** (`src/lib/mcp/tools/*`): `get_training_context` passa a devolver a pasta atual, padrões x variações e as trocas por grupo muscular; `create_routine` ganha `folder` (default: pasta atual) e `papel` (`padrao`/`variacao`, com `motivo`). O `.lovable/mcp/manifest.json` é atualizado junto.
- **Claude bridge** (`src/lib/claude-bridge.ts`): o schema `FORJA1` de rotina ganha os mesmos campos opcionais, mantendo compatibilidade com códigos antigos.

---

## 9. i18n

Todas as strings novas passam por `t()` com o texto em inglês, e a tradução vai num dicionário novo, `src/lib/i18n/dict/folders.ts` (pt + nl), registrado em `src/lib/i18n/index.tsx`. Isso respeita o `react/jsx-no-literals`.

---

## 10. Fases de entrega

Cada fase pode ir para produção sozinha:

| Fase | Entrega | Resultado visível |
|---|---|---|
| **1. Base de dados** | migração SQL, tipos, `data/folders.ts`, backfill "Meu treino", fallback sem migração | nada muda na UI; os dados passam a ter pasta |
| **2. Registrar trocas** | `substituiDe` + motivo no `ActiveExercise`, chips de motivo nos dois fluxos de troca, gravação nos sets/workout, passo no diálogo final | o detalhe da sessão mostra "no lugar de…" |
| **3. Treino = pasta atual** | cabeçalho da pasta, padrões em destaque, variações recolhidas, sheet "Minhas pastas" | a experiência pedida no dia a dia |
| **4. Detalhe da pasta + Progresso** | rota `pasta.$id`, histórico agrupado, cards de variação, "o que mais foi trocado" | a visão do ciclo |
| **5. Encerrar ciclo → modelo** | assistente de 3 passos, "começar do modelo" | o ciclo se fecha e se renova |
| **6. Coach/MCP/bridge** | recomendação só com padrões, ranking de swap pelo histórico, contexto para o Claude | o coach entende o programa |

---

## 11. Decisões (fechadas em 24/09)

1. **Nome:** **Pasta**.
2. **Só uma pasta atual:** **sim** (garantido por índice único no banco).
3. **"Atualizar o padrão" no fim da sessão:** **sim**, já na fase 2.
4. **Modelos e pastas arquivadas:** **editáveis**.

## 12. Status

- **Fase 1 — feita.** `scripts/supabase-migration-folders.sql`; tipos `TrainingFolder`/`SwapReason`; `loadFolders`/`persistFolder` em `forja.functions.ts`; `src/lib/data/folders.ts`. A primeira leitura cria "Meu treino" e arquiva nela todas as rotinas e sessões existentes. Sem a migração, tudo segue funcionando como antes.
- **Fase 2 — feita.** Trocas registradas (`substituiDe` → `workout_sets.substitui_exercise_id`); sessão salva com `folder_id`, `variacao` e `motivo`; passo "Você trocou N exercícios" no diálogo de finalizar (motivo + só hoje / guardar como variação / atualizar o padrão); detalhe da sessão mostra "no lugar de X (grupo)" e o selo de variação. O Coach já não recomenda rotinas variação.
- **Fase 3 — feita.** Treino abre na pasta atual: cabeçalho (nome, sessões desde o início) que abre **Minhas pastas** (renomear, tornar atual, nova pasta vazia ou copiando as rotinas atuais); rotinas padrão da pasta em destaque; seção **Variações (N)** recolhida, tracejada, com rotinas variação (Começar / Tornar padrão) e as 5 últimas sessões variação (Repetir com as mesmas trocas / Tornar padrão / Detalhes), cada uma com o motivo e os grupos musculares trocados. "Tornar padrão" numa rotina variação inverte os papéis (a original vira variação dela e cede os dias da semana). O Coach recomenda só rotinas padrão da pasta atual, e a escolha do dia feita em outra pasta deixa de valer.
- **Fase 4 — feita.** Detalhe da pasta como **sheet de tela cheia** (`FolderDetailSheet`), não como rota: o `routeTree.gen.ts` é gerado pelos plugins do TanStack Start/Lovable no build e não deve ser editado à mão. Abre por "Ver pasta" em Minhas pastas e no histórico de Progresso. Mostra resumo (sessões, padrão × variação, % que seguiu o padrão, volume), rotinas padrão (última vez, nº de sessões), variações (abertas), **Mais trocados** (por grupo muscular, com contagem e motivos) e todas as sessões da pasta; permite renomear e tornar atual. Em Progresso: filtro de pasta acima do de rotina, histórico agrupado por pasta (atual aberta, anteriores recolhidas) e sessões variação num cartão compacto e tracejado com motivo e "↻ grupo".
