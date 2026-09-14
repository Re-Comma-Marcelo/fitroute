-- Route — schema for an external (self-owned) Supabase project.
-- Run this ONCE in the Supabase SQL editor, then run scripts/supabase-seed.sql.
--
-- Notes:
--  * IDs are text so the app can keep stable, readable ids (e1, r1, w3...).
--  * user_id is plain text (default 'demo') because the app currently runs with
--    open access. Switching to real auth later means writing auth.uid()::text
--    into user_id and adding the owner-scoped policies at the bottom.
--  * RLS is enabled on every table and NO grants are given to anon /
--    authenticated: the browser never talks to Supabase directly, every read
--    and write goes through server functions using the service role.

-- Profiles -------------------------------------------------------------------

create table if not exists public.profiles (
  id text primary key,
  user_id text not null unique default 'demo',
  nome text not null default '',
  peso_kg numeric not null default 70,
  altura_cm integer not null default 170,
  sexo text not null default 'masculino',
  nivel_atividade text not null default 'moderado',
  objetivo text not null default 'hipertrofia',
  meta_treinos_semana integer not null default 4,
  equipment text[] not null default '{}',
  avoid_exercises jsonb not null default '[]',
  session_length_min integer not null default 60,
  preferred_time text not null default 'evening',
  check_in_mode text not null default 'card',
  idioma text not null default 'en',
  peso_inicial_kg numeric,
  peso_meta_kg numeric,
  meta_iniciada_em text,
  meta_prazo text,
  idade integer,
  meta_kcal integer,
  meta_proteina_g integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exercises ------------------------------------------------------------------

create table if not exists public.exercises (
  id text primary key,
  user_id text,
  nome text not null,
  grupo_primario text not null,
  grupos_secundarios text[] not null default '{}',
  equipamento text not null,
  instrucoes text not null default '',
  midia_url text,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

-- Routines -------------------------------------------------------------------

create table if not exists public.routines (
  id text primary key,
  user_id text not null default 'demo',
  nome text not null,
  descricao text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_exercises (
  id text primary key,
  routine_id text not null references public.routines (id) on delete cascade,
  exercise_id text not null,
  ordem integer not null default 0,
  series_alvo integer not null default 3,
  reps_min integer not null default 8,
  reps_max integer not null default 12,
  descanso_seg integer not null default 120,
  notas text not null default ''
);

-- Workouts -------------------------------------------------------------------

create table if not exists public.workouts (
  id text primary key,
  user_id text not null default 'demo',
  routine_id text references public.routines (id) on delete set null,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  duracao_seg integer not null default 0,
  volume_total_kg numeric not null default 0,
  notas text not null default '',
  origem text not null default 'rotina',
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id text primary key,
  workout_id text not null references public.workouts (id) on delete cascade,
  exercise_id text not null,
  ordem_exercicio integer not null default 0,
  serie_num integer not null default 1,
  tipo_serie text not null default 'normal',
  peso_kg numeric not null default 0,
  reps integer not null default 0,
  rpe numeric,
  concluida boolean not null default false
);

-- Coach memory ---------------------------------------------------------------

create table if not exists public.coach_notes (
  id text primary key,
  user_id text not null default 'demo',
  kind text not null default 'observation',
  content text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Nutrition ------------------------------------------------------------------

-- Retired: one meal per slot. Kept so existing rows can still be imported
-- into meal_entries; nothing writes to it any more.
create table if not exists public.meal_plan (
  user_id text not null default 'demo',
  plan_date text not null,
  slot text not null,
  meal_id text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date, slot)
);

-- The meal diary: several meals per eating moment, planned and/or eaten.
create table if not exists public.meal_entries (
  id text primary key,
  user_id text not null,
  entry_date date not null,
  slot text not null,
  meal_id text not null,
  entry_time text,
  -- 1 = one serving, 0.5 = half of it.
  portion numeric not null default 1,
  planned boolean not null default true,
  eaten boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists meal_entries_user_date_idx
  on public.meal_entries (user_id, entry_date);

create table if not exists public.meal_schedule (
  user_id text not null default 'demo',
  slot text not null,
  slot_time text not null,
  enabled boolean not null default true,
  primary key (user_id, slot)
);

create table if not exists public.custom_meals (
  id text primary key,
  user_id text not null,
  nome text not null,
  slots text[] not null default '{}',
  kcal integer not null default 0,
  protein_g integer not null default 0,
  carbs_g integer not null default 0,
  fat_g integer not null default 0,
  prep_min integer not null default 0,
  tags text[] not null default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  order_out boolean not null default false,
  source text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists public.shopping_checked (
  user_id text not null default 'demo',
  item_key text not null,
  primary key (user_id, item_key)
);

-- Progress -------------------------------------------------------------------

create table if not exists public.tracked_lifts (
  user_id text not null default 'demo',
  exercise_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

-- Indexes --------------------------------------------------------------------

create index if not exists exercises_grupo_idx on public.exercises (grupo_primario);
create index if not exists routine_exercises_routine_id_idx on public.routine_exercises (routine_id);
create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_iniciado_em_idx on public.workouts (iniciado_em);
create index if not exists workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index if not exists workout_sets_exercise_id_idx on public.workout_sets (exercise_id);
create index if not exists coach_notes_user_id_idx on public.coach_notes (user_id);
create index if not exists custom_meals_user_id_idx on public.custom_meals (user_id);

-- Grants + RLS ---------------------------------------------------------------
-- service_role only: the app reaches the database exclusively through server
-- functions. anon / authenticated intentionally get nothing.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','exercises','routines','routine_exercises','workouts',
    'workout_sets','coach_notes','meal_plan','meal_schedule',
    'shopping_checked','tracked_lifts','custom_meals','meal_entries'
  ]
  loop
    execute format('grant all on public.%I to service_role', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- updated_at triggers --------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists routines_updated_at on public.routines;
create trigger routines_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();
