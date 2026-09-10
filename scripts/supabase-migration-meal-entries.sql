-- Flexible meal diary: several meals per eating moment, planned and/or eaten.
-- Run in the Supabase SQL editor. Safe to run more than once.

create table if not exists public.meal_entries (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_date date not null,
  slot text not null,
  meal_id text not null,
  entry_time text,
  planned boolean not null default true,
  eaten boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists meal_entries_user_date_idx
  on public.meal_entries (user_id, entry_date);

grant select, insert, update, delete on public.meal_entries to authenticated;
grant all on public.meal_entries to service_role;

alter table public.meal_entries enable row level security;

drop policy if exists "own meal entries" on public.meal_entries;
create policy "own meal entries"
  on public.meal_entries
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
