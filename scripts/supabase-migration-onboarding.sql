-- Onboarding completion on the profile.
--
-- Until now "did this person finish the welcome flow?" lived only in
-- localStorage, so a new phone or a cleared cache replayed the flow and could
-- create a second set of starter routines. The app keeps the local flag as a
-- fallback while this column does not exist yet.
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.profiles add column if not exists onboarding_concluido_em date;
