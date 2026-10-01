-- Main goal of the route: body weight (default) or one lift, e.g. "bench
-- 100 kg in 12 weeks". The onboarding interview asks for it and the route's
-- checkpoints are built from it (see src/lib/route/goal-path.ts).
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.profiles add column if not exists meta_tipo text;
alter table public.profiles add column if not exists meta_exercise_id text;
alter table public.profiles add column if not exists meta_lift_inicial_kg numeric;
alter table public.profiles add column if not exists meta_lift_kg numeric;
