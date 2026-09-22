-- Onboarding completion on the profile.
--
-- Until now "did this person finish the welcome flow?" lived only in
-- localStorage, so a new phone or a cleared cache replayed the flow and could
-- create a second set of starter routines. The app keeps the local flag as a
-- fallback while this column does not exist yet.
-- ISO yyyy-mm-dd as text, like meta_prazo. Applied on 2026-09-20; safe to run again.

alter table public.profiles add column if not exists onboarding_concluido_em text;
