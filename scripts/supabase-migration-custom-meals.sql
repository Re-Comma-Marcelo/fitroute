-- Custom meals created by the user (AI estimate from text or photo).
-- Run this once in the SQL editor of your Supabase project.

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

create index if not exists custom_meals_user_id_idx on public.custom_meals (user_id);

grant all on public.custom_meals to service_role;
revoke all on public.custom_meals from anon, authenticated;
alter table public.custom_meals enable row level security;
