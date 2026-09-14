-- Flexible meal diary: several meals per eating moment, planned and/or eaten.
-- This is the ONE model of what a day holds; the older per-slot `meal_plan`
-- table is read-only now and only feeds a one-time import.
--
-- Access follows the same pattern as every other table in this project: the
-- app talks to Supabase through server functions with the service role, so
-- `user_id` is text and anon/authenticated get nothing.
-- Run in the Supabase SQL editor. Safe to run more than once.

create table if not exists public.meal_entries (
  id text primary key,
  user_id text not null,
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

grant all on public.meal_entries to service_role;
revoke all on public.meal_entries from anon, authenticated;
alter table public.meal_entries enable row level security;
