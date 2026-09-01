-- Body weight log + routine weekday scheduling.
-- Run this once in the SQL editor of your Supabase project.

create table if not exists public.body_weight_log (
  id text primary key,
  user_id text not null,
  data text not null,
  peso_kg numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, data)
);

create index if not exists body_weight_log_user_id_idx on public.body_weight_log (user_id);

grant all on public.body_weight_log to service_role;
revoke all on public.body_weight_log from anon, authenticated;
alter table public.body_weight_log enable row level security;

-- Which weekdays a routine is planned for (0 = Sunday ... 6 = Saturday).
alter table public.routines
  add column if not exists dias_semana integer[] not null default '{}';
