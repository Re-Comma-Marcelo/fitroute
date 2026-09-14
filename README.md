# Route

Construa a CASCA (frontend puro) de um PWA de registro de treino de musculação, mobile-first.

## REGRA MAIS IMPORTANTE — LEIA PRIMEIRO
- NÃO ative o Lovable Cloud. Em hipótese alguma.
- NÃO crie banco de dados, NÃO crie autenticação real, NÃO crie edge functions, NÃO crie backend de nenhum tipo.
- Este projeto é 100% frontend com dados mockados. Vou conectar meu próprio Supabase depois, manualmente.
- Se em algum momento você achar que precisa de backend: pare e apenas deixe o mock no lugar.

## Arquitetura de dados (crítica para a fase seguinte)
Isole TODO acesso a dados em `src/lib/data/`, com um arquivo por domínio:
`exercises.ts`, `routines.ts`, `workouts.ts`, `profile.ts`.

Cada arquivo exporta funções **assíncronas** (`async`) com assinatura já no formato final, ex:
```ts
export async function getRoutines(): Promise<Routine[]>
export async function getExerciseHistory(exerciseId: string): Promise<WorkoutSet[]>
export async function saveWorkout(workout: Workout): Promise<Workout>
```
Por enquanto elas leem/gravam de um mock em memória (`src/lib/data/mocks.ts`) com um pequeno delay artificial. Nenhum componente pode importar o mock diretamente — só as funções da camada de dados. O objetivo é que trocar mock por Supabase depois seja mexer só em `src/lib/data/`, sem tocar em nenhuma tela.

Tipos TypeScript em `src/lib/types.ts`, seguindo este modelo:

```
Profile        id, nome, pesoKg, alturaCm, sexo, nivelAtividade, objetivo
Exercise       id, nome, grupoPrimario, gruposSecundarios[], equipamento, instrucoes, midiaUrl, isCustom
Routine        id, nome, descricao, exercicios: RoutineExercise[]
RoutineExercise  id, exerciseId, ordem, seriesAlvo, repsMin, repsMax, descansoSeg, notas
Workout        id, routineId?, iniciadoEm, finalizadoEm?, duracaoSeg, volumeTotalKg, notas, origem
WorkoutSet     id, workoutId, exerciseId, ordemExercicio, serieNum, tipoSerie, pesoKg, reps, rpe?, concluida
```
`tipoSerie`: 'aquecimento' | 'normal' | 'falha' | 'drop'

## Stack e visual
React + TypeScript + Tailwind + shadcn/ui. **Dark mode como padrão** (treino é à noite). Mobile-first, viewport de referência 375x667. Tipografia grande, alto contraste, alvos de toque mínimos de 44x44px. Estética limpa e direta, sem gradiente e sem enfeite — referência de qualidade: Hevy.

Navegação inferior com 4 abas: **Treino**, **Dieta**, **Progresso**, **Perfil**.

## Telas a construir

**1. Login** — só visual: e-mail, senha, botão "Entrar" e "Entrar com link mágico". Qualquer clique navega direto pra Home (sem validação, sem auth). Deixe um comentário `// TODO: Supabase Auth`.

**2. Home (aba Treino)** — lista de rotinas salvas em cards (nome, nº de exercícios, último treino feito), botão grande "Iniciar treino" e opção "Treino em branco". Botão de criar nova rotina.

**3. Editor de rotina** — nome, descrição, lista ordenada de exercícios com drag-and-drop para reordenar. Por exercício: séries-alvo, faixa de reps (min–max), descanso em segundos, notas. Adicionar exercício abre a biblioteca. Remover exercício.

**4. Biblioteca de exercícios** — busca por nome + filtros por grupo muscular e equipamento. Popule o mock com ~40 exercícios reais de musculação em português (supino reto, supino inclinado com halteres, agachamento livre, leg press, levantamento terra, remada curvada, puxada alta, desenvolvimento militar, elevação lateral, rosca direta, tríceps testa, cadeira extensora, mesa flexora, panturrilha em pé, etc.), cada um com grupo primário, secundários, equipamento e instruções de execução em 2-3 frases. Ao tocar num exercício, abre detalhe com instruções e músculos trabalhados.

**5. SESSÃO DE TREINO EM ANDAMENTO — a tela mais importante do app.**
É usada em pé, com uma mão, com a mão suada, entre séries, com pressa. Todo o design do app se adapta a ela.
- Cronômetro geral da sessão sempre visível no topo, fixo.
- Lista de exercícios do treino; o exercício atual expandido, os demais colapsados.
- Por exercício, uma tabela de séries com colunas: nº da série, peso (kg), reps, RPE (opcional) e um botão de check.
- **Cada linha vem pré-preenchida em cinza (placeholder) com o peso e as reps da mesma série no treino anterior daquele exercício**, puxado do mock de histórico. Um toque no check aceita o valor sugerido e marca como concluída.
- Registrar uma série deve exigir **no máximo 2 toques**.
- Campos de peso e reps usam `inputMode="decimal"` e `inputMode="numeric"` — nunca teclado alfanumérico.
- Ao marcar uma série como concluída, um **timer de descanso** aparece e começa a contar sozinho com o valor configurado no exercício, com barra de progresso e opção de +15s / -15s / pular.
- Botão para adicionar exercício no meio da sessão, remover ou pular exercício.
- Menu por série para trocar o tipo (aquecimento / normal / falha / drop).
- Campo de nota por exercício e nota geral da sessão.
- Botão "Finalizar treino" → tela de resumo com duração, volume total em kg, número de séries e PRs batidos.
- O estado da sessão em andamento persiste em `localStorage`: fechar e reabrir o app não pode perder o treino.

**6. Histórico (aba Progresso)** — lista de sessões passadas (data, rotina, duração, volume). Abrir uma sessão mostra tudo que foi registrado. Por exercício, um gráfico de evolução de carga ao longo do tempo (use recharts).

**7. Perfil** — nome, peso, altura, sexo, nível de atividade, objetivo (cutting / manutenção / bulking). Só formulário, salvando no mock.

**8. Dieta** — apenas um estado vazio bonito com o texto "Em breve" e um resumo estático de macros desenhado (kcal, proteína, carboidrato, gordura, com anéis de progresso). Não construa a funcionalidade agora, é só a casca visual da aba.

## Regras de UX inegociáveis
1. Toda ação frequente cabe em 1–2 toques.
2. Sugerir sempre, exigir nunca: última carga, meta, valores anteriores vêm pré-preenchidos e editáveis.
3. Nenhuma tela vazia sem ação clara ou dado de exemplo.
4. Nenhum modal desnecessário na tela de sessão de treino.
5. Dark mode padrão.

## Ordem de construção
Tipos e camada de dados mockada → Login → Home → **Sessão de treino** → Editor de rotina → Biblioteca → Histórico → Perfil → Dieta (placeholder).
A tela de sessão de treino é a que define o produto. Se algo tiver que ficar mal feito, não é ela.

Popule o mock com dados realistas: 2 rotinas (Upper e Lower), ~40 exercícios e 6 sessões de treino já concluídas nas últimas 3 semanas, para que os gráficos e as sugestões de carga anterior tenham o que mostrar.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://fitroute.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6348699b-3af7-46e0-9c05-163e356b7bc2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
