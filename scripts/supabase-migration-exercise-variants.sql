-- Exercise variants: lets one exercise (e.g. Chest-Supported Row) be logged
-- in more than one way (e.g. wide vs narrow grip) while sharing the same
-- history/progression stream, instead of needing a separate catalog entry
-- per variant.
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.exercises add column if not exists variants jsonb;
alter table public.workout_sets add column if not exists variant_id text;
