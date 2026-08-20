# Migrar Forja para Supabase externo com autenticação

## Objetivo
Substituir a camada de dados em memória (`src/lib/data/mocks.ts`) por uma conta Supabase fora do Lovable, com autenticação de usuários e persistência real de perfil, exercícios, rotinas, treinos e séries.

## Pré-requisito (ação do usuário)
Não há ferramenta de agente para conectar um Supabase externo. O usuário deve conectar a conta via **Project Settings → Integrations → Supabase**, escolher a conexão OAuth com o projeto Supabase existente e autorizar. Após isso, as variáveis de ambiente (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) ficam disponíveis no runtime do servidor.

## Fase 1: Conectar e verificar o projeto Supabase
1. Orientar o usuário a concluir a integração em Project Settings → Integrations → Supabase.
2. Verificar se as variáveis de ambiente estão injetadas (`secrets--fetch_secrets` ou leitura em server function de teste).
3. Confirmar que o projeto não está usando Lovable Cloud (`supabase--enable` NÃO será chamado).

## Fase 2: Esquema do banco de dados
Criar uma migration do Supabase com as tabelas e políticas RLS. Todas as tabelas no schema `public` recebem GRANTs, RLS habilitado e políticas baseadas em `auth.uid()`.

### Tabelas
```text
profiles
  - id uuid PK references auth.users(id) on delete cascade
  - nome text
  - peso_kg numeric
  - altura_cm numeric
  - sexo text
  - nivel_atividade text
  - objetivo text
  - meta_treinos_semana integer default 4
  - created_at, updated_at

exercises
  - id uuid PK default gen_random_uuid()
  - user_id uuid nullable (null = exercício global, visível a todos)
  - nome text
  - grupo_primario text
  - grupos_secundarios text[]
  - equipamento text
  - instrucoes text
  - midia_url text
  - is_custom boolean default false
  - created_at

routines
  - id uuid PK default gen_random_uuid()
  - user_id uuid not null references auth.users(id)
  - nome text
  - descricao text
  - created_at, updated_at

routine_exercises
  - id uuid PK default gen_random_uuid()
  - routine_id uuid not null references routines(id) on delete cascade
  - exercise_id uuid not null references exercises(id)
  - ordem integer
  - series_alvo integer
  - reps_min integer
  - reps_max integer
  - descanso_seg integer
  - notas text

workouts
  - id uuid PK default gen_random_uuid()
  - user_id uuid not null references auth.users(id)
  - routine_id uuid nullable references routines(id)
  - iniciado_em timestamptz
  - finalizado_em timestamptz nullable
  - duracao_seg integer
  - volume_total_kg numeric
  - notas text
  - origem text
  - created_at

workout_sets
  - id uuid PK default gen_random_uuid()
  - workout_id uuid not null references workouts(id) on delete cascade
  - exercise_id uuid not null references exercises(id)
  - ordem_exercicio integer
  - serie_num integer
  - tipo_serie text
  - peso_kg numeric
  - reps integer
  - rpe numeric nullable
  - concluida boolean
```

### Políticas RLS
- `profiles`: SELECT/INSERT/UPDATE/DELETE apenas para `user_id = auth.uid()`.
- `exercises`: SELECT global (todos os usuários veem exercícios do sistema e os próprios). INSERT/UPDATE/DELETE apenas para `user_id = auth.uid()` ou `is_custom = true` do usuário.
- `routines`, `routine_exercises`, `workouts`, `workout_sets`: SELECT/INSERT/UPDATE/DELETE apenas para `user_id = auth.uid()`.
- Toda tabela recebe GRANT apropriado (`authenticated`, `service_role`) e `ENABLE ROW LEVEL SECURITY`.

## Fase 3: Autenticação
1. Verificar se o Supabase client do browser já existe em `src/integrations/supabase/client`. Se não existir, criar usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. Criar/ajustar `src/start.ts` para adicionar `attachSupabaseAuth` ao `functionMiddleware`, garantindo que server functions protegidas recebam o bearer token.
3. Criar hook `useAuth` com `supabase.auth.onAuthStateChange` e expor `user`, `session`, `signIn`, `signUp`, `signOut`.
4. Transformar a rota `/index` (login) em tela pública de sign-in/sign-up real usando `supabase.auth.signInWithPassword` / `signUp`.
5. Criar o layout `_authenticated/route.tsx` para proteger todas as rotas do app (Treino, Sessão, Biblioteca, Progresso, Perfil, Dieta, Resumo, Editor de rotina).

## Fase 4: Migração da camada de dados
Manter os arquivos `src/lib/data/*.ts` como fachada, mas substituir as implementações por chamadas a `createServerFn` do Supabase. As assinaturas permanecem assíncronas para não quebrar os componentes.

### Exercícios (`src/lib/data/exercises.ts`)
- `getExercises`: server function que busca exercícios globais (`user_id is null`) e os customizados do usuário.
- `getExercise`, `getMuscleGroups`, `getEquipments`: server functions com filtros.
- `createExercise`: server function autenticada que insere com `user_id = auth.uid()` e `is_custom = true`.

### Rotinas (`src/lib/data/routines.ts`)
- `getRoutines`, `getRoutine`, `getRoutineLastWorkoutDate`, `countRoutineSetsLogged`, `saveRoutine`, `deleteRoutine`: server functions autenticadas manipulando `routines` + `routine_exercises`.

### Treinos (`src/lib/data/workouts.ts`)
- `getWorkouts`, `getWorkout`, `getWorkoutSets`, `getExerciseHistory`, `getLastSetsForExercise`, `getPersonalRecord`, `saveWorkout`, `deleteWorkout`: server functions autenticadas.
- `saveWorkout` faz insert/update de `workouts` e `workout_sets` dentro de uma transação (usando supabase.rpc ou múltiplas chamadas com rollback manual).

### Perfil (`src/lib/data/profile.ts`)
- `getProfile`: server function autenticada busca `profiles` por `id = auth.uid()`; se não existir, cria um perfil padrão com `meta_treinos_semana = 4`.
- `saveProfile`: server function autenticada faz upsert.

### Sementes
- Mover os 43 exercícios do `mocks.ts` para uma migration de `INSERT INTO exercises` com `user_id = null` (exercícios do sistema).
- Criar seed com dados históricos de 6 treinos para demonstrar progressão, vinculados a um usuário de teste (se o ambiente permitir) ou mantidos como script de demonstração.

## Fase 5: Atualização de rotas e componentes
1. Mover todas as rotas protegidas para `src/routes/_authenticated/*`:
   - `treino.tsx`, `biblioteca.tsx`, `progresso.tsx`, `progresso.index.tsx`, `progresso.$id.tsx`, `perfil.tsx`, `dieta.tsx`, `sessao.tsx`, `resumo.$id.tsx`, `rotina.$id.tsx`.
2. Deixar `index.tsx` como rota pública de login.
3. Adicionar `auth/callback.tsx` se necessário para OAuth social (mesmo que inicialmente usemos email/senha, o callback é padrão).
4. Atualizar `__root.tsx` para escutar `onAuthStateChange` e invalidar o router/query client em `SIGNED_IN`/`SIGNED_OUT`.
5. Ajustar o `AppShell` para mostrar o usuário logado e a opção de logout.
6. Garantir que o `SessionMiniPlayer` continue funcionando mesmo durante navegação entre abas.

## Fase 6: Validação
1. Testar build local (`tsgo` ou `tsc --noEmit`) e verificar logs de build.
2. Testar com Playwright: cadastro → login → criar rotina → iniciar sessão → registrar séries → concluir treino → ver histórico e progresso.
3. Verificar que o registro de série continua em no máximo 2 toques.
4. Confirmar que dados de um usuário não aparecem para outro (RLS).

## Decisões técnicas
- **Supabase externo**: o usuário mantém a conta fora do Lovable; usamos apenas o `service role key` para runtime server-side e o `publishable key` + anon para o browser.
- **Autenticação**: começamos com email/senha. OAuth social (Google) pode ser adicionado depois com `supabase--configure_social_auth` se solicitado.
- **Transações**: usamos Supabase RPC/transações ou sequência de inserts com tratamento de erro; não usamos Edge Functions.
- **ID global vs custom**: exercícios do sistema têm `user_id = null`; exercícios criados pelo usuário têm `user_id = auth.uid()` e `is_custom = true`.
- **Progressão semanal**: a meta de treinos semanais é lida de `profiles.meta_treinos_semana`; o contador de `0/4` passa a ser calculado a partir dos treinos finalizados do usuário na semana corrente.
