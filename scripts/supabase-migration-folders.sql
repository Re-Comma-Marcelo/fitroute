-- Pastas de treino: groups routines and sessions into training blocks.
-- One folder per user is the current one ('atual'); a closed block becomes a
-- template ('modelo') or is archived ('arquivada'). Routines are either the
-- folder's standard ('padrao') or a variation of one ('variacao'); sessions
-- remember the folder they were done in and whether they strayed from the
-- standard, and each set remembers which standard exercise it replaced.
-- Safe to run more than once.

create table if not exists public.training_folders (
  id text primary key,
  user_id text not null,
  nome text not null,
  status text not null default 'atual',
  origem_modelo_id text references public.training_folders (id) on delete set null,
  inicio_em timestamptz not null default now(),
  fim_em timestamptz,
  created_at timestamptz not null default now(),
  constraint training_folders_status_check check (status in ('atual', 'arquivada', 'modelo'))
);

create index if not exists training_folders_user_id_idx on public.training_folders (user_id);

-- At most one current folder per user.
create unique index if not exists training_folders_one_current
  on public.training_folders (user_id) where status = 'atual';

alter table public.routines
  add column if not exists folder_id text references public.training_folders (id) on delete set null,
  add column if not exists papel text not null default 'padrao',
  add column if not exists variacao_de text references public.routines (id) on delete set null,
  add column if not exists motivo text;

alter table public.workouts
  add column if not exists folder_id text references public.training_folders (id) on delete set null,
  add column if not exists variacao boolean not null default false,
  add column if not exists motivo text;

alter table public.workout_sets
  add column if not exists substitui_exercise_id text;

create index if not exists routines_folder_id_idx on public.routines (folder_id);
create index if not exists workouts_folder_id_idx on public.workouts (folder_id);

alter table public.training_folders enable row level security;
