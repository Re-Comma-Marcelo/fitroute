create type public.equipamento_enum as enum (
  'Barra', 'Halteres', 'Máquina', 'Cabos', 'Peso Corporal', 'Kettlebell', 'Elástico', 'Smith'
);

-- Profiles

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  peso_kg numeric not null default 70,
  altura_cm integer not null default 170,
  sexo text not null default 'masculino',
  nivel_atividade text not null default 'moderado',
  objetivo text not null default 'hipertrofia',
  meta_treinos_semana integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id);

-- Exercises

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  nome text not null,
  grupo_primario text not null,
  grupos_secundarios text[] not null default '{}',
  equipamento text not null,
  instrucoes text not null default '',
  midia_url text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.exercises to authenticated;
grant all on public.exercises to service_role;

alter table public.exercises enable row level security;

create policy "Global exercises are readable by everyone"
  on public.exercises for select
  to authenticated
  using (user_id is null or user_id = auth.uid());

create policy "Users can create own exercises"
  on public.exercises for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own exercises"
  on public.exercises for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own exercises"
  on public.exercises for delete
  to authenticated
  using (user_id = auth.uid());

-- Routines

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  descricao text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.routines to authenticated;
grant all on public.routines to service_role;

alter table public.routines enable row level security;

create policy "Users can manage own routines"
  on public.routines for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Routine exercises

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  ordem integer not null default 0,
  series_alvo integer not null default 3,
  reps_min integer not null default 8,
  reps_max integer not null default 12,
  descanso_seg integer not null default 120,
  notas text not null default ''
);

grant select, insert, update, delete on public.routine_exercises to authenticated;
grant all on public.routine_exercises to service_role;

alter table public.routine_exercises enable row level security;

create policy "Users can manage routine exercises of own routines"
  on public.routine_exercises for all
  to authenticated
  using (
    routine_id in (
      select id from public.routines where user_id = auth.uid()
    )
  )
  with check (
    routine_id in (
      select id from public.routines where user_id = auth.uid()
    )
  );

-- Workouts

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  duracao_seg integer not null default 0,
  volume_total_kg numeric not null default 0,
  notas text not null default '',
  origem text not null default 'manual',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.workouts to authenticated;
grant all on public.workouts to service_role;

alter table public.workouts enable row level security;

create policy "Users can manage own workouts"
  on public.workouts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Workout sets

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  ordem_exercicio integer not null default 0,
  serie_num integer not null default 1,
  tipo_serie text not null default 'normal',
  peso_kg numeric not null default 0,
  reps integer not null default 0,
  rpe numeric,
  concluida boolean not null default false
);

grant select, insert, update, delete on public.workout_sets to authenticated;
grant all on public.workout_sets to service_role;

alter table public.workout_sets enable row level security;

create policy "Users can manage sets of own workouts"
  on public.workout_sets for all
  to authenticated
  using (
    workout_id in (
      select id from public.workouts where user_id = auth.uid()
    )
  )
  with check (
    workout_id in (
      select id from public.workouts where user_id = auth.uid()
    )
  );

-- Indexes

create index exercises_user_id_idx on public.exercises (user_id);
create index exercises_grupo_idx on public.exercises (grupo_primario);
create index routines_user_id_idx on public.routines (user_id);
create index routine_exercises_routine_id_idx on public.routine_exercises (routine_id);
create index workouts_user_id_idx on public.workouts (user_id);
create index workouts_finalizado_em_idx on public.workouts (finalizado_em);
create index workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index workout_sets_exercise_id_idx on public.workout_sets (exercise_id);

-- Trigger to update profiles.updated_at and routines.updated_at

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger routines_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();
