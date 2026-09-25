-- Distance (km) on cross-training logs, so run/walk/bike/swim entries carry
-- enough data for the app to compute pace and reason about them, not just a
-- duration + intensity guess. Also widens the `kind` values accepted (adds
-- "swim") — no schema change needed for that, it's a plain text column.
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.cross_training_logs add column if not exists distancia_km numeric;
