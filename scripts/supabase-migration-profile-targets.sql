-- Age and manual nutrition targets on the profile.
--
-- Age feeds the Mifflin-St Jeor calculation (it used to be hardcoded to 30).
-- The two target columns let someone use the numbers their dietitian gave
-- them instead of the calculation. All three are nullable: empty means
-- "calculate it for me".
-- Run in the Supabase SQL editor. Safe to run more than once.

alter table public.profiles add column if not exists idade integer;
alter table public.profiles add column if not exists meta_kcal integer;
alter table public.profiles add column if not exists meta_proteina_g integer;
