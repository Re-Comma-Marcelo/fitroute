-- Adds the UI language preference to profiles.
-- Run once in the Supabase SQL editor of your project (safe to re-run).
alter table public.profiles
  add column if not exists idioma text not null default 'en';
